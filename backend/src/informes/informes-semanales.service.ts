import { createWriteStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument = require('pdfkit');
import nodemailer from 'nodemailer';
import { DataSource, In, Repository } from 'typeorm';
import { Equipo } from '../common/entities/equipo.entity';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import { Informe } from '../common/entities/informe.entity';
import { InformeSemanal } from '../common/entities/informe-semanal.entity';
import { loadConfiguredHolidaySet } from '../common/utils/business-days';
import { SendWeeklyReportEmailDto } from '../common/dto/send-weekly-report-email.dto';

type WeekRange = {
  weekStartIso: string;
  weekEndIso: string;
  businessDates: string[];
};

type WeeklyMetrics = {
  weekStartIso: string;
  weekEndIso: string;
  businessDates: string[];
  generatedAtIso: string;
  kpis: {
    totalHallazgos: number;
    hallazgosSolucionados: number;
    hallazgosPendientes: number;
    equiposIntervenidos: number;
    informesGenerados: number;
    cierrePct: number;
  };
  dailyHallazgos: Array<{ date: string; label: string; total: number }>;
  estadoHallazgos: {
    pendientes: number;
    solucionados: number;
    enProceso: number;
  };
  hallazgosPorModulo: Array<{ modulo: string; total: number }>;
  equiposResumen: Array<{
    equipoId: number;
    codigo: string;
    nombre: string;
    reportados: number;
    solucionados: number;
    pendientes: number;
    estado: 'ESTABLE' | 'ATENCION' | 'CRITICO';
  }>;
  hallazgosReportados: Array<{
    id: number;
    fecha: string;
    equipoCodigo: string;
    equipoNombre: string;
    modulo: string;
    estado: string;
    descripcion: string;
  }>;
};

type WeeklyComparison = {
  hallazgosReportadosPct: number;
  hallazgosSolucionadosPct: number;
  equiposIntervenidosPct: number;
  informesGeneradosPct: number;
  tendenciaGeneral: 'MEJORO' | 'IGUAL' | 'EMPEORO';
};

type GenerateWeeklyReportOptions = {
  tecnicoScope?: string;
  force?: boolean;
  origin: 'AUTO' | 'MANUAL';
};

@Injectable()
export class InformesSemanalesService {
  private readonly logger = new Logger(InformesSemanalesService.name);
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(InformeSemanal)
    private readonly informesSemanalesRepository: Repository<InformeSemanal>,
    @InjectRepository(Hallazgo)
    private readonly hallazgosRepository: Repository<Hallazgo>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Informe)
    private readonly informesRepository: Repository<Informe>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('0 0 16 * * 5', { timeZone: 'America/Bogota' })
  async generateAutomaticWeeklyReport() {
    const autoWeeklyEnabled = (process.env.WEEKLY_REPORT_AUTO_ENABLED || 'true').toLowerCase() !== 'false';
    if (!autoWeeklyEnabled) {
      this.logger.log('Generacion automatica de informe semanal deshabilitada por configuracion.');
      return;
    }

    try {
      await this.generateWeeklyReport({ origin: 'AUTO', tecnicoScope: 'TODOS', force: false });
      this.logger.log('Informe semanal automatico generado.');
    } catch (error) {
      this.logger.error(`No se pudo generar informe semanal automatico: ${(error as Error).message}`);
    }
  }

  async listHistory() {
    await this.ensureSchema();
    const rows = await this.informesSemanalesRepository.find({
      order: { fechaGeneracion: 'DESC' },
    });

    return rows.map((row) => this.toHistoryItem(row));
  }

  async generateManually(tecnicoScope?: string, force = true) {
    const report = await this.generateWeeklyReport({
      origin: 'MANUAL',
      tecnicoScope: tecnicoScope || 'TODOS',
      force,
    });

    return {
      ...report,
      accion: report.reutilizado ? 'reutilizado' : 'generado',
    };
  }

  async getPdfInfo(id: number) {
    await this.ensureSchema();
    const row = await this.informesSemanalesRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Informe semanal no encontrado.');
    }

    return row;
  }

  async sendByEmail(id: number, dto: SendWeeklyReportEmailDto) {
    const report = await this.getPdfInfo(id);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    const from = process.env.REPORT_EMAIL_FROM || process.env.SMTP_USER;
    if (!from) {
      throw new NotFoundException('Configura REPORT_EMAIL_FROM o SMTP_USER para enviar correos.');
    }

    const weekLabel = `${report.semanaInicio} a ${report.semanaFin}`;
    await transport.sendMail({
      from,
      to: dto.to,
      subject: dto.subject || `TrazaDH - Informe Semanal ${weekLabel}`,
      text:
        dto.message ||
        `Adjunto encontraras el Informe Semanal Automatico de TrazaDH (${weekLabel}).\n\nGenerado: ${report.fechaGeneracion.toISOString()}`,
      attachments: [
        {
          filename: report.pdfFileName,
          path: report.pdfFilePath,
          contentType: 'application/pdf',
        },
      ],
    });

    return {
      ok: true,
      mensaje: 'Correo enviado correctamente.',
      informeId: report.id,
      destino: dto.to,
    };
  }

  private async generateWeeklyReport(options: GenerateWeeklyReportOptions) {
    await this.ensureSchema();

    const now = new Date();
    const weekRange = await this.resolveWeekRange(now);
    const existing = await this.informesSemanalesRepository.findOne({
      where: {
        semanaInicio: weekRange.weekStartIso,
        semanaFin: weekRange.weekEndIso,
        tecnicoScope: String(options.tecnicoScope || 'TODOS').trim().toUpperCase(),
      },
      order: { fechaGeneracion: 'DESC' },
    });

    if (existing && !options.force) {
      return {
        ...this.toHistoryItem(existing),
        reutilizado: true,
      };
    }

    const previousWeekRange = await this.resolveWeekRange(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const currentMetrics = await this.collectMetrics(weekRange);
    const previousMetrics = await this.collectMetrics(previousWeekRange);
    const comparison = this.buildComparison(currentMetrics, previousMetrics);
    const aiSummary = this.buildExecutiveSummary(currentMetrics, comparison);

    const payload = {
      currentMetrics,
      comparison,
      previousWeekStartIso: previousWeekRange.weekStartIso,
      previousWeekEndIso: previousWeekRange.weekEndIso,
      generatedBy: options.tecnicoScope || 'TODOS',
      origin: options.origin,
    };

    const output = await this.renderWeeklyPdf({
      metrics: currentMetrics,
      comparison,
      summary: aiSummary,
      tecnicoScope: options.tecnicoScope || 'Todos los tecnicos',
    });

    const entity = this.informesSemanalesRepository.create({
      semanaInicio: currentMetrics.weekStartIso,
      semanaFin: currentMetrics.weekEndIso,
      tecnicoScope: String(options.tecnicoScope || 'TODOS').trim().toUpperCase(),
      estado: 'GENERADO',
      pdfFilePath: output.filePath,
      pdfFileName: output.fileName,
      payloadJson: JSON.stringify(payload),
      resumenEjecutivo: aiSummary,
      fechaGeneracion: new Date(),
    });

    const saved = await this.informesSemanalesRepository.save(entity);
    return {
      ...this.toHistoryItem(saved),
      reutilizado: false,
    };
  }

  private async collectMetrics(range: WeekRange): Promise<WeeklyMetrics> {
    const hallazgos = range.businessDates.length
      ? await this.hallazgosRepository.find({
          where: { fechaHallazgo: In(range.businessDates) },
        })
      : [];

    const hallazgosSolucionados = hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'SOLUCIONADO').length;
    const hallazgosPendientes = hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'PENDIENTE').length;
    const hallazgosEnProceso = hallazgos.length - hallazgosSolucionados - hallazgosPendientes;

    const equiposIds = Array.from(new Set(hallazgos.map((item) => Number(item.equipoId)).filter((id) => id > 0)));
    const equipos = equiposIds.length
      ? await this.equiposRepository.find({ where: { id: In(equiposIds) } })
      : [];

    const equiposById = new Map<number, Equipo>();
    equipos.forEach((equipo) => {
      equiposById.set(equipo.id, equipo);
    });

    const byModuloMap = new Map<string, number>();
    hallazgos.forEach((hallazgo) => {
      const modulo = this.normalizeModulo(hallazgo.modulo);
      byModuloMap.set(modulo, (byModuloMap.get(modulo) ?? 0) + 1);
    });

    const byEquipoMap = new Map<number, { reportados: number; solucionados: number; pendientes: number }>();
    hallazgos.forEach((hallazgo) => {
      const equipoId = Number(hallazgo.equipoId);
      if (!equipoId || !Number.isFinite(equipoId)) {
        return;
      }

      const current = byEquipoMap.get(equipoId) ?? { reportados: 0, solucionados: 0, pendientes: 0 };
      current.reportados += 1;

      const estado = this.normalizeEstado(hallazgo.estado);
      if (estado === 'SOLUCIONADO') {
        current.solucionados += 1;
      } else if (estado === 'PENDIENTE') {
        current.pendientes += 1;
      }

      byEquipoMap.set(equipoId, current);
    });

    const dailyMap = new Map<string, number>();
    range.businessDates.forEach((date) => {
      dailyMap.set(date, 0);
    });

    hallazgos.forEach((hallazgo) => {
      const current = dailyMap.get(hallazgo.fechaHallazgo) ?? 0;
      dailyMap.set(hallazgo.fechaHallazgo, current + 1);
    });

    const informesGenerados = range.businessDates.length
      ? await this.informesRepository
          .createQueryBuilder('informe')
          .where("TO_CHAR(informe.fechaGeneracion, 'YYYY-MM-DD') IN (:...dates)", { dates: range.businessDates })
          .getCount()
      : 0;

    const totalHallazgos = hallazgos.length;
    const cierrePct = totalHallazgos ? (hallazgosSolucionados / totalHallazgos) * 100 : 0;

    const dailyHallazgos = range.businessDates.map((date) => ({
      date,
      label: this.shortWeekdayLabel(date),
      total: dailyMap.get(date) ?? 0,
    }));

    const hallazgosPorModulo = Array.from(byModuloMap.entries())
      .map(([modulo, total]) => ({ modulo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const equiposResumen = Array.from(byEquipoMap.entries())
      .map(([equipoId, stats]) => {
        const equipo = equiposById.get(equipoId);
        const estado = this.resolveEquipoBadgeState(stats);

        return {
          equipoId,
          codigo: equipo?.idEquipo || `EQ-${equipoId}`,
          nombre: equipo?.nombreEquipo || 'Equipo sin nombre',
          reportados: stats.reportados,
          solucionados: stats.solucionados,
          pendientes: stats.pendientes,
          estado,
        };
      })
      .sort((a, b) => {
        if (b.reportados !== a.reportados) {
          return b.reportados - a.reportados;
        }
        return b.pendientes - a.pendientes;
      })
      .slice(0, 7);

    const hallazgosReportados = hallazgos
      .map((hallazgo) => {
        const equipo = equiposById.get(Number(hallazgo.equipoId));
        return {
          id: hallazgo.id,
          fecha: hallazgo.fechaHallazgo,
          equipoCodigo: equipo?.idEquipo || `EQ-${hallazgo.equipoId}`,
          equipoNombre: equipo?.nombreEquipo || 'Equipo sin nombre',
          modulo: this.normalizeModulo(hallazgo.modulo),
          estado: this.normalizeEstado(hallazgo.estado),
          descripcion: String(hallazgo.descripcionHallazgo || 'Sin descripcion').trim(),
        };
      })
      .sort((a, b) => {
        const byDate = b.fecha.localeCompare(a.fecha);
        if (byDate !== 0) {
          return byDate;
        }
        return b.id - a.id;
      });

    return {
      weekStartIso: range.weekStartIso,
      weekEndIso: range.weekEndIso,
      businessDates: range.businessDates,
      generatedAtIso: new Date().toISOString(),
      kpis: {
        totalHallazgos,
        hallazgosSolucionados,
        hallazgosPendientes,
        equiposIntervenidos: equiposIds.length,
        informesGenerados,
        cierrePct,
      },
      dailyHallazgos,
      estadoHallazgos: {
        pendientes: hallazgosPendientes,
        solucionados: hallazgosSolucionados,
        enProceso: hallazgosEnProceso,
      },
      hallazgosPorModulo,
      equiposResumen,
      hallazgosReportados,
    };
  }

  private buildComparison(current: WeeklyMetrics, previous: WeeklyMetrics): WeeklyComparison {
    const hallazgosReportadosPct = this.percentDelta(current.kpis.totalHallazgos, previous.kpis.totalHallazgos);
    const hallazgosSolucionadosPct = this.percentDelta(current.kpis.hallazgosSolucionados, previous.kpis.hallazgosSolucionados);
    const equiposIntervenidosPct = this.percentDelta(current.kpis.equiposIntervenidos, previous.kpis.equiposIntervenidos);
    const informesGeneradosPct = this.percentDelta(current.kpis.informesGenerados, previous.kpis.informesGenerados);

    const score =
      (current.kpis.hallazgosSolucionados - previous.kpis.hallazgosSolucionados)
      - (current.kpis.hallazgosPendientes - previous.kpis.hallazgosPendientes)
      - (current.kpis.totalHallazgos - previous.kpis.totalHallazgos);

    let tendenciaGeneral: 'MEJORO' | 'IGUAL' | 'EMPEORO' = 'IGUAL';
    if (score > 0) {
      tendenciaGeneral = 'MEJORO';
    } else if (score < 0) {
      tendenciaGeneral = 'EMPEORO';
    }

    return {
      hallazgosReportadosPct,
      hallazgosSolucionadosPct,
      equiposIntervenidosPct,
      informesGeneradosPct,
      tendenciaGeneral,
    };
  }

  private buildExecutiveSummary(metrics: WeeklyMetrics, comparison: WeeklyComparison) {
    const topModulo = metrics.hallazgosPorModulo[0];
    const topEquipo = metrics.equiposResumen[0];
    const cierre = metrics.kpis.cierrePct.toFixed(1);
    const trendText =
      comparison.tendenciaGeneral === 'MEJORO'
        ? 'La tendencia general del mantenimiento mejoro frente a la semana anterior.'
        : comparison.tendenciaGeneral === 'EMPEORO'
          ? 'La tendencia general del mantenimiento empeoro frente a la semana anterior.'
          : 'La tendencia general del mantenimiento se mantuvo estable respecto a la semana anterior.';

    const p1 = `Durante la semana del ${metrics.weekStartIso} al ${metrics.weekEndIso} se registraron ${metrics.kpis.totalHallazgos} hallazgos en jornadas habiles. Se solucionaron ${metrics.kpis.hallazgosSolucionados} casos y quedaron ${metrics.kpis.hallazgosPendientes} pendientes.`;
    const p2 = topModulo
      ? `El modulo con mayor incidencia fue ${topModulo.modulo} con ${topModulo.total} hallazgos, por lo que se recomienda priorizar inspecciones preventivas en ese frente tecnico.`
      : 'No se registraron incidencias por modulo durante la semana analizada.';
    const p3 = topEquipo
      ? `El equipo con mayor actividad fue ${topEquipo.nombre} (${topEquipo.codigo}) con ${topEquipo.reportados} hallazgos reportados. Este comportamiento sugiere reforzar seguimiento tecnico y trazabilidad de cierres.`
      : 'No hubo equipos con actividad relevante durante el periodo evaluado.';
    const p4 = `El porcentaje general de cierre semanal fue ${cierre}%. ${trendText}`;
    const p5 = 'Se recomienda mantener disciplina en cierres de hallazgos dentro de la misma semana habil, con foco en modulos recurrentes y en equipos con mayor volumen de incidencias.';

    return [p1, p2, p3, p4, p5].join('\n\n');
  }

  private async renderWeeklyPdf(params: {
    metrics: WeeklyMetrics;
    comparison: WeeklyComparison;
    summary: string;
    tecnicoScope: string;
  }) {
    const outDir = join(process.cwd(), 'public', 'reports', 'weekly');
    await mkdir(outDir, { recursive: true });

    const fileName = `trazadh-informe-semanal-${params.metrics.weekStartIso}_${params.metrics.weekEndIso}.pdf`;
    const filePath = join(outDir, fileName);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 24 });
    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    const fonts = this.resolveFonts(doc);

    const colors = {
      red: '#C62828',
      redDark: '#8E0000',
      white: '#FFFFFF',
      bg: '#F8F9FB',
      border: '#E5E7EB',
      text: '#1F2937',
      muted: '#6B7280',
      green: '#16A34A',
      yellow: '#CA8A04',
      orange: '#D97706',
    } as const;

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 24;
    const innerWidth = pageWidth - margin * 2;

    doc.rect(0, 0, pageWidth, pageHeight).fill(colors.bg);

    this.drawHeader(doc, {
      x: margin,
      y: margin,
      width: innerWidth,
      height: 72,
      colors,
      metrics: params.metrics,
      tecnicoScope: params.tecnicoScope,
      fonts,
    });

    this.drawKpiRow(doc, {
      x: margin,
      y: 104,
      width: innerWidth,
      height: 78,
      colors,
      metrics: params.metrics,
      comparison: params.comparison,
      fonts,
    });

    const blockGap = 12;
    const blockWidth = (innerWidth - blockGap) / 2;

    this.drawHallazgosByDayChart(doc, {
      x: margin,
      y: 190,
      width: blockWidth,
      height: 120,
      colors,
      metrics: params.metrics,
      fonts,
    });

    this.drawEstadoDonutChart(doc, {
      x: margin + blockWidth + blockGap,
      y: 190,
      width: blockWidth,
      height: 120,
      colors,
      metrics: params.metrics,
      fonts,
    });

    this.drawModuloBars(doc, {
      x: margin,
      y: 318,
      width: blockWidth,
      height: 116,
      colors,
      metrics: params.metrics,
      fonts,
    });

    this.drawEquiposTable(doc, {
      x: margin + blockWidth + blockGap,
      y: 318,
      width: blockWidth,
      height: 116,
      colors,
      metrics: params.metrics,
      fonts,
    });

    this.drawComparisonRow(doc, {
      x: margin,
      y: 442,
      width: innerWidth,
      height: 50,
      colors,
      comparison: params.comparison,
      fonts,
    });

    this.drawReportedFindingsAndSummary(doc, {
      x: margin,
      y: 500,
      width: innerWidth,
      height: 74,
      colors,
      metrics: params.metrics,
      summary: params.summary,
      fonts,
    });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', (error) => reject(error));
    });

    return { filePath, fileName };
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      metrics: WeeklyMetrics;
      tecnicoScope: string;
      fonts: { regular: string; bold: string };
    },
  ) {
    this.drawCard(doc, params.x, params.y, params.width, params.height, params.colors.white, params.colors.border);

    doc.fillColor(params.colors.red)
      .fontSize(18)
      .font(params.fonts.bold)
      .text('TrazaDH', params.x + 16, params.y + 12, { lineBreak: false });

    doc.fillColor(params.colors.text)
      .fontSize(16)
      .font(params.fonts.bold)
      .text('Informe Semanal de Mantenimiento', params.x + 120, params.y + 12, { lineBreak: false });

    const rangeText = `Rango: del ${params.metrics.weekStartIso} al ${params.metrics.weekEndIso}`;
    const generatedText = `Generado: ${new Date(params.metrics.generatedAtIso).toLocaleString('es-CO', { hour12: false })}`;

    doc.fillColor(params.colors.muted)
      .fontSize(9)
      .font(params.fonts.regular)
      .text(rangeText, params.x + 120, params.y + 36);

    doc.text(generatedText, params.x + 120, params.y + 50);

    doc.fillColor(params.colors.text)
      .fontSize(10)
      .font(params.fonts.bold)
      .text(`Tecnico: ${params.tecnicoScope || 'Todos los tecnicos'}`, params.x + params.width - 260, params.y + 20, {
        width: 240,
        align: 'right',
      });
  }

  private drawKpiRow(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      metrics: WeeklyMetrics;
      comparison: WeeklyComparison;
      fonts: { regular: string; bold: string };
    },
  ) {
    const gap = 8;
    const cardWidth = (params.width - gap * 5) / 6;

    const cards = [
      {
        title: 'Hallazgos',
        value: params.metrics.kpis.totalHallazgos,
        delta: params.comparison.hallazgosReportadosPct,
      },
      {
        title: 'Solucionados',
        value: params.metrics.kpis.hallazgosSolucionados,
        delta: params.comparison.hallazgosSolucionadosPct,
      },
      {
        title: 'Pendientes',
        value: params.metrics.kpis.hallazgosPendientes,
        delta: -params.comparison.hallazgosReportadosPct,
      },
      {
        title: 'Equipos',
        value: params.metrics.kpis.equiposIntervenidos,
        delta: params.comparison.equiposIntervenidosPct,
      },
      {
        title: 'Informes',
        value: params.metrics.kpis.informesGenerados,
        delta: params.comparison.informesGeneradosPct,
      },
      {
        title: 'Cierre %',
        value: `${params.metrics.kpis.cierrePct.toFixed(1)}%`,
        delta: params.comparison.hallazgosSolucionadosPct,
      },
    ];

    cards.forEach((card, index) => {
      const x = params.x + index * (cardWidth + gap);
      this.drawCard(doc, x, params.y, cardWidth, params.height, params.colors.white, params.colors.border);

      doc.font(params.fonts.regular).fontSize(8).fillColor(params.colors.muted).text(card.title, x + 10, params.y + 10);
      doc.font(params.fonts.bold).fontSize(18).fillColor(params.colors.text).text(String(card.value), x + 10, params.y + 26);

      const positive = card.delta >= 0;
      const arrow = positive ? 'UP' : 'DOWN';
      const deltaColor = positive ? params.colors.green : params.colors.red;
      doc.font(params.fonts.bold)
        .fontSize(8)
        .fillColor(deltaColor)
        .text(`${arrow} ${Math.abs(card.delta).toFixed(1)}%`, x + 10, params.y + 58);
    });
  }

  private drawHallazgosByDayChart(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      metrics: WeeklyMetrics;
      fonts: { regular: string; bold: string };
    },
  ) {
    this.drawCard(doc, params.x, params.y, params.width, params.height, params.colors.white, params.colors.border);

    doc.font(params.fonts.bold)
      .fontSize(10)
      .fillColor(params.colors.text)
      .text('Hallazgos reportados durante la semana', params.x + 10, params.y + 8);

    const chartX = params.x + 12;
    const chartY = params.y + 30;
    const chartW = params.width - 24;
    const chartH = params.height - 44;
    const maxValue = Math.max(1, ...params.metrics.dailyHallazgos.map((item) => item.total));
    const barGap = 10;
    const barWidth = (chartW - barGap * (params.metrics.dailyHallazgos.length - 1)) / Math.max(1, params.metrics.dailyHallazgos.length);

    params.metrics.dailyHallazgos.forEach((item, index) => {
      const barHeight = (item.total / maxValue) * (chartH - 22);
      const x = chartX + index * (barWidth + barGap);
      const y = chartY + (chartH - 22 - barHeight);

      doc.roundedRect(x, y, barWidth, barHeight, 3).fill(params.colors.red);
      doc.font(params.fonts.bold).fontSize(7).fillColor(params.colors.text).text(String(item.total), x, y - 10, { width: barWidth, align: 'center' });
      doc.font(params.fonts.regular).fontSize(7).fillColor(params.colors.muted).text(item.label, x, chartY + chartH - 16, { width: barWidth, align: 'center' });
    });
  }

  private drawEstadoDonutChart(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      metrics: WeeklyMetrics;
      fonts: { regular: string; bold: string };
    },
  ) {
    this.drawCard(doc, params.x, params.y, params.width, params.height, params.colors.white, params.colors.border);
    doc.font(params.fonts.bold)
      .fontSize(10)
      .fillColor(params.colors.text)
      .text('Estado actual de los hallazgos', params.x + 10, params.y + 8);

    const stats = params.metrics.estadoHallazgos;
    const total = Math.max(1, stats.pendientes + stats.solucionados + stats.enProceso);
    const cx = params.x + 88;
    const cy = params.y + 74;
    const outerR = 35;
    const innerR = 17;

    const segments = [
      { key: 'Pendientes', value: stats.pendientes, color: params.colors.red },
      { key: 'Solucionados', value: stats.solucionados, color: params.colors.green },
      { key: 'En proceso', value: stats.enProceso, color: params.colors.orange },
    ];

    let angle = -Math.PI / 2;
    segments.forEach((segment) => {
      const delta = (segment.value / total) * Math.PI * 2;
      if (delta > 0) {
        doc.save();
        doc.moveTo(cx, cy);
        (doc as any).arc(cx, cy, outerR, angle, angle + delta);
        doc.lineTo(cx, cy);
        doc.fill(segment.color);
        doc.restore();
      }
      angle += delta;
    });

    doc.circle(cx, cy, innerR).fill(params.colors.white);

    let legendY = params.y + 36;
    segments.forEach((segment) => {
      const pct = ((segment.value / total) * 100).toFixed(1);
      doc.roundedRect(params.x + 150, legendY + 2, 8, 8, 2).fill(segment.color);
      doc.fillColor(params.colors.text)
        .font(params.fonts.regular)
        .fontSize(8)
        .text(`${segment.key}: ${segment.value} (${pct}%)`, params.x + 164, legendY, { width: params.width - 174 });
      legendY += 22;
    });
  }

  private drawModuloBars(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      metrics: WeeklyMetrics;
      fonts: { regular: string; bold: string };
    },
  ) {
    this.drawCard(doc, params.x, params.y, params.width, params.height, params.colors.white, params.colors.border);

    doc.font(params.fonts.bold).fontSize(10).fillColor(params.colors.text).text('Hallazgos por modulo', params.x + 10, params.y + 8);

    const rows = params.metrics.hallazgosPorModulo.slice(0, 5);
    const max = Math.max(1, ...rows.map((row) => row.total));
    let cursorY = params.y + 28;

    rows.forEach((row) => {
      const label = row.modulo.length > 28 ? `${row.modulo.slice(0, 28)}...` : row.modulo;
      const barWidth = ((params.width - 180) * row.total) / max;

      doc.font(params.fonts.regular).fontSize(7).fillColor(params.colors.text).text(label, params.x + 10, cursorY + 4, { width: 110 });
      doc.roundedRect(params.x + 118, cursorY + 6, barWidth, 8, 3).fill(params.colors.redDark);
      doc.font(params.fonts.bold).fontSize(7).fillColor(params.colors.muted).text(String(row.total), params.x + 124 + barWidth, cursorY + 4);
      cursorY += 18;
    });
  }

  private drawEquiposTable(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      metrics: WeeklyMetrics;
      fonts: { regular: string; bold: string };
    },
  ) {
    this.drawCard(doc, params.x, params.y, params.width, params.height, params.colors.white, params.colors.border);

    doc.font(params.fonts.bold).fontSize(10).fillColor(params.colors.text).text('Resumen por equipos', params.x + 10, params.y + 8);

    const headers = ['Equipo', 'Cod', 'Rep', 'Sol', 'Pen', 'Estado'];
    const colWidths = [160, 70, 30, 30, 30, 58];
    let colX = params.x + 10;
    headers.forEach((header, index) => {
      doc.font(params.fonts.bold).fontSize(7).fillColor(params.colors.muted).text(header, colX, params.y + 24, { width: colWidths[index] });
      colX += colWidths[index];
    });

    const rows = params.metrics.equiposResumen.slice(0, 4);
    let rowY = params.y + 38;

    rows.forEach((row) => {
      let x = params.x + 10;
      doc.font(params.fonts.regular).fontSize(7).fillColor(params.colors.text).text(this.crop(row.nombre, 31), x, rowY, { width: colWidths[0] });
      x += colWidths[0];
      doc.text(this.crop(row.codigo, 10), x, rowY, { width: colWidths[1] });
      x += colWidths[1];
      doc.text(String(row.reportados), x, rowY, { width: colWidths[2] });
      x += colWidths[2];
      doc.text(String(row.solucionados), x, rowY, { width: colWidths[3] });
      x += colWidths[3];
      doc.text(String(row.pendientes), x, rowY, { width: colWidths[4] });
      x += colWidths[4];

      const badgeColor = row.estado === 'ESTABLE' ? '#16A34A' : row.estado === 'ATENCION' ? '#CA8A04' : '#C62828';
      doc.roundedRect(x, rowY - 1, colWidths[5] - 4, 10, 4).fillOpacity(0.12).fill(badgeColor).fillOpacity(1);
      doc.font(params.fonts.bold).fontSize(6).fillColor(badgeColor).text(row.estado, x + 3, rowY + 1, { width: colWidths[5] - 10, align: 'center' });

      rowY += 18;
    });
  }

  private drawComparisonRow(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      comparison: WeeklyComparison;
      fonts: { regular: string; bold: string };
    },
  ) {
    this.drawCard(doc, params.x, params.y, params.width, params.height, params.colors.white, params.colors.border);

    doc.font(params.fonts.bold).fontSize(10).fillColor(params.colors.text).text('Comparacion con la semana anterior', params.x + 10, params.y + 8);

    const items = [
      { label: 'Hallazgos', value: params.comparison.hallazgosReportadosPct },
      { label: 'Solucionados', value: params.comparison.hallazgosSolucionadosPct },
      { label: 'Equipos', value: params.comparison.equiposIntervenidosPct },
      { label: 'Informes', value: params.comparison.informesGeneradosPct },
    ];

    const trendColor =
      params.comparison.tendenciaGeneral === 'MEJORO'
        ? params.colors.green
        : params.comparison.tendenciaGeneral === 'EMPEORO'
          ? params.colors.red
          : params.colors.yellow;

    const itemWidth = 124;
    items.forEach((item, index) => {
      const x = params.x + 10 + index * (itemWidth + 8);
      const positive = item.value >= 0;
      const color = positive ? params.colors.green : params.colors.red;
      doc.roundedRect(x, params.y + 26, itemWidth, 20, 6).fillOpacity(0.08).fill(color).fillOpacity(1);
      doc.fillColor(params.colors.text).font(params.fonts.regular).fontSize(7).text(item.label, x + 6, params.y + 30);
      doc.fillColor(color)
        .font(params.fonts.bold)
        .fontSize(8)
        .text(`${positive ? 'UP' : 'DOWN'} ${Math.abs(item.value).toFixed(1)}%`, x + 58, params.y + 30);
    });

    doc.roundedRect(params.x + params.width - 178, params.y + 26, 168, 20, 6).fillOpacity(0.1).fill(trendColor).fillOpacity(1);
    doc.fillColor(trendColor)
      .font(params.fonts.bold)
      .fontSize(8)
      .text(`Tendencia general: ${params.comparison.tendenciaGeneral}`, params.x + params.width - 172, params.y + 32, {
        width: 156,
        align: 'center',
      });
  }

  private drawReportedFindingsAndSummary(
    doc: PDFKit.PDFDocument,
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      colors: Record<string, string>;
      metrics: WeeklyMetrics;
      summary: string;
      fonts: { regular: string; bold: string };
    },
  ) {
    const gap = 10;
    const findingsWidth = Math.floor(params.width * 0.62);
    const summaryWidth = params.width - findingsWidth - gap;

    this.drawCard(doc, params.x, params.y, findingsWidth, params.height, params.colors.white, params.colors.border);
    this.drawCard(
      doc,
      params.x + findingsWidth + gap,
      params.y,
      summaryWidth,
      params.height,
      params.colors.white,
      params.colors.border,
    );

    doc.font(params.fonts.bold)
      .fontSize(9)
      .fillColor(params.colors.text)
      .text('Hallazgos reportados de la semana', params.x + 10, params.y + 8);

    const findings = params.metrics.hallazgosReportados.slice(0, 4);
    let rowY = params.y + 22;
    findings.forEach((item) => {
      const line = `[${item.fecha}] ${this.crop(item.equipoCodigo, 12)} · ${this.crop(item.modulo, 20)} · ${item.estado}`;
      doc.font(params.fonts.regular).fontSize(7).fillColor(params.colors.text).text(line, params.x + 10, rowY, {
        width: findingsWidth - 20,
        ellipsis: true,
      });

      const desc = this.crop(item.descripcion, 95);
      doc.font(params.fonts.regular).fontSize(6.5).fillColor(params.colors.muted).text(desc, params.x + 10, rowY + 9, {
        width: findingsWidth - 20,
        ellipsis: true,
      });

      rowY += 16;
    });

    if (!findings.length) {
      doc.font(params.fonts.regular).fontSize(7).fillColor(params.colors.muted).text(
        'No se reportaron hallazgos durante la semana evaluada.',
        params.x + 10,
        params.y + 28,
      );
    }

    doc.font(params.fonts.bold)
      .fontSize(9)
      .fillColor(params.colors.text)
      .text('Resumen ejecutivo automatico (IA)', params.x + findingsWidth + gap + 10, params.y + 8);

    const paragraphs = params.summary.split(/\n\n+/).slice(0, 2);
    const text = paragraphs.join('  ');

    doc.font(params.fonts.regular).fontSize(6.5).fillColor(params.colors.muted).text(
      text,
      params.x + findingsWidth + gap + 10,
      params.y + 22,
      {
        width: summaryWidth - 20,
        height: params.height - 26,
        ellipsis: true,
      },
    );
  }

  private resolveFonts(doc: PDFKit.PDFDocument) {
    const regularPath = process.env.PDF_FONT_INTER_REGULAR_PATH || join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf');
    const boldPath = process.env.PDF_FONT_INTER_BOLD_PATH || join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf');

    if (existsSync(regularPath) && existsSync(boldPath)) {
      doc.registerFont('Inter-Regular', regularPath);
      doc.registerFont('Inter-Bold', boldPath);
      return {
        regular: 'Inter-Regular',
        bold: 'Inter-Bold',
      };
    }

    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
    };
  }

  private drawCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, fill: string, border: string) {
    doc.roundedRect(x, y, width, height, 16).fillAndStroke(fill, border);
  }

  private crop(value: string, size: number) {
    if (!value) {
      return '-';
    }

    return value.length > size ? `${value.slice(0, Math.max(1, size - 3))}...` : value;
  }

  private resolveEquipoBadgeState(stats: {
    reportados: number;
    solucionados: number;
    pendientes: number;
  }): 'ESTABLE' | 'ATENCION' | 'CRITICO' {
    if (stats.reportados > 0 && stats.pendientes === 0) {
      return 'ESTABLE';
    }

    if (stats.solucionados >= stats.pendientes) {
      return 'ATENCION';
    }

    return 'CRITICO';
  }

  private normalizeEstado(value: string | null | undefined) {
    const estado = String(value || '').trim().toUpperCase();

    if (estado === 'CERRADO' || estado === 'SOLUCIONADO') {
      return 'SOLUCIONADO';
    }

    if (estado === 'PENDIENTE') {
      return 'PENDIENTE';
    }

    return 'EN_PROCESO';
  }

  private normalizeModulo(value: string | null | undefined) {
    const text = String(value || '').trim();
    return text || 'Sin modulo';
  }

  private shortWeekdayLabel(isoDate: string) {
    const date = this.parseIsoToDate(isoDate);
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  }

  private percentDelta(current: number, previous: number) {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    return ((current - previous) / previous) * 100;
  }

  private async resolveWeekRange(referenceDate: Date): Promise<WeekRange> {
    const bogotaTodayIso = this.toBogotaIsoDate(referenceDate);
    const bogotaToday = this.parseIsoToDate(bogotaTodayIso);
    const weekday = bogotaToday.getUTCDay();

    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const monday = new Date(bogotaToday);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);

    const days: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + index);
      days.push(this.toIsoDateFromUtcDate(date));
    }

    const holidaysByYear = new Map<number, Set<string>>();
    const businessDates: string[] = [];

    for (const dayIso of days) {
      const date = this.parseIsoToDate(dayIso);
      const year = date.getUTCFullYear();
      let holidays = holidaysByYear.get(year);
      if (!holidays) {
        holidays = await loadConfiguredHolidaySet(date);
        holidaysByYear.set(year, holidays);
      }

      const weekdayValue = date.getUTCDay();
      const isWeekend = weekdayValue === 0 || weekdayValue === 6;
      const isHoliday = holidays.has(dayIso);

      if (!isWeekend && !isHoliday) {
        businessDates.push(dayIso);
      }
    }

    return {
      weekStartIso: this.toIsoDateFromUtcDate(monday),
      weekEndIso: this.toIsoDateFromUtcDate(new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000)),
      businessDates,
    };
  }

  private parseIsoToDate(isoDate: string) {
    return new Date(`${isoDate}T12:00:00Z`);
  }

  private toBogotaIsoDate(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(date);
  }

  private toIsoDateFromUtcDate(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toHistoryItem(row: InformeSemanal) {
    const payload = this.parsePayload(row.payloadJson);
    const hallazgosReportados = Array.isArray(payload?.currentMetrics?.hallazgosReportados)
      ? payload.currentMetrics.hallazgosReportados.slice(0, 20)
      : [];

    return {
      id: row.id,
      semanaInicio: row.semanaInicio,
      semanaFin: row.semanaFin,
      tecnicoScope: row.tecnicoScope,
      estado: row.estado,
      fechaGeneracion:
        row.fechaGeneracion instanceof Date
          ? row.fechaGeneracion.toISOString()
          : String(row.fechaGeneracion),
      pdf: {
        nombreArchivo: row.pdfFileName,
        descargaUrl: `/informes/semanales/${row.id}/pdf`,
      },
      resumenEjecutivo: row.resumenEjecutivo,
      hallazgosReportados,
    };
  }

  private parsePayload(raw: string) {
    try {
      return JSON.parse(String(raw || '{}')) as any;
    } catch {
      return null;
    }
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS informes_semanales (
          id BIGSERIAL PRIMARY KEY,
          semana_inicio DATE NOT NULL,
          semana_fin DATE NOT NULL,
          tecnico_scope VARCHAR(120) NOT NULL DEFAULT 'TODOS',
          estado VARCHAR(20) NOT NULL DEFAULT 'GENERADO',
          pdf_file_path TEXT NOT NULL,
          pdf_file_name VARCHAR(180) NOT NULL,
          payload_json TEXT NOT NULL DEFAULT '{}',
          resumen_ejecutivo TEXT NULL,
          fecha_generacion TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_informes_semanales_fecha_generacion
          ON informes_semanales(fecha_generacion DESC);

        CREATE INDEX IF NOT EXISTS idx_informes_semanales_semana
          ON informes_semanales(semana_inicio, semana_fin, tecnico_scope);
      `).then(() => undefined);
    }

    await this.schemaReady;
  }
}
