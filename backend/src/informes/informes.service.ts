import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateInformeDto } from '../common/dto/create-informe.dto';
import { Equipo } from '../common/entities/equipo.entity';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import { Informe } from '../common/entities/informe.entity';
import { Plantilla } from '../common/entities/plantilla.entity';

const ALLOWED_MODULES = [
  'VERIFICACION DE SEGURIDAD Y CALIDAD',
  'LIMPIEZA L1',
  'LIMPIEZA L2',
  'SISTEMA PARACAIDA, LIMITADOR DE VELOCIDAD Y PESACARGAS',
  'LIMPIEZA L3',
  'SISTEMA MAQUINA FRENO',
  'SISTEMA SUSPENSION',
  'SISTEMA ELECTRIFICACION',
  'SISTEMA PUERTAS DE CABINA',
  'SISTEMA PUERTAS DE PISO',
  'ACTUALIZAR EQUIPO',
  'CAMBIO DE CABLES',
];

const ALLOWED_MODULES_BY_KEY = new Map(ALLOWED_MODULES.map((moduleName) => [normalizeModuleKey(moduleName), moduleName]));

@Injectable()
export class InformesService {
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(Informe)
    private readonly informesRepository: Repository<Informe>,
    @InjectRepository(Plantilla)
    private readonly plantillasRepository: Repository<Plantilla>,
    @InjectRepository(Hallazgo)
    private readonly hallazgosRepository: Repository<Hallazgo>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    await this.ensureSchema();

    const informes = await this.informesRepository.find({
      order: { fechaGeneracion: 'DESC' },
    });

    return informes.map((informe) => this.toResponse(informe));
  }

  async preview(body: CreateInformeDto) {
    await this.ensureSchema();
    return this.buildDraft(body);
  }

  async create(body: CreateInformeDto) {
    await this.ensureSchema();

    const draft = await this.buildDraft(body);
    const observaciones = body.observaciones?.trim() || draft.textoGenerado || 'Informe sin plantilla asociada';

    const informe = this.informesRepository.create({
      mantenimientoId: draft.mantenimientoId,
      equipoId: draft.equipoId,
      modulosText: JSON.stringify(draft.modulos),
      observaciones,
      pendientes: this.normalizeOptionalText(body.pendientes),
      recomendaciones: this.normalizeOptionalText(body.recomendaciones),
      fechaGeneracion: new Date(),
    });

    const saved = await this.informesRepository.save(informe);
    return {
      ...this.toResponse(saved),
      resumenHallazgos: draft.resumenHallazgos,
    };
  }

  private async buildDraft(body: CreateInformeDto) {
    const modulos = this.normalizeModules(body);
    const mantenimientoId = this.normalizeOptionalNumber(body.mantenimientoId);
    const equipoId = await this.resolveEquipoId(body.equipoId, body.equipoCodigo);
    const equipo = equipoId
      ? await this.equiposRepository.findOne({ where: { id: equipoId } })
      : null;

    const plantillas = await this.loadPlantillas(modulos);
    const textoPlantillas = this.composeTemplateText(plantillas);
    const hallazgos = await this.loadHallazgosForDraft(equipoId, mantenimientoId);
    const seccionHallazgos = this.composeHallazgosSection(hallazgos);
    const intro = this.composeIntro(mantenimientoId, equipo);

    const blocks = [
      intro,
      textoPlantillas || 'No existe plantilla para alguno de los modulos seleccionados. Redaccion manual habilitada.',
      seccionHallazgos,
    ].filter(Boolean);

    return {
      mantenimientoId,
      equipoId,
      equipo: equipo
        ? {
            id: equipo.id,
            idEquipo: equipo.idEquipo,
            nombreEquipo: equipo.nombreEquipo,
            rutaNumero: equipo.rutaNumero,
          }
        : null,
      modulos,
      textoGenerado: blocks.join('\n\n'),
      resumenHallazgos: {
        total: hallazgos.length,
        abiertos: hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'ABIERTO').length,
        pendientes: hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'PENDIENTE').length,
        solucionados: hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'SOLUCIONADO').length,
      },
    };
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS informes (
          id BIGSERIAL PRIMARY KEY,
          mantenimiento_id INTEGER NULL,
          equipo_id BIGINT NULL REFERENCES equipos(id) ON UPDATE CASCADE ON DELETE SET NULL,
          modulos_text TEXT NOT NULL DEFAULT '[]',
          observaciones TEXT NOT NULL,
          pendientes TEXT NULL,
          recomendaciones TEXT NULL,
          fecha_generacion TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        ALTER TABLE informes
        DROP COLUMN IF EXISTS plantillas_aplicadas_text;

        CREATE INDEX IF NOT EXISTS idx_informes_fecha_generacion ON informes(fecha_generacion DESC);
        CREATE INDEX IF NOT EXISTS idx_informes_equipo_id ON informes(equipo_id);
      `).then(() => undefined);
    }

    await this.schemaReady;
  }

  private async loadPlantillas(modulos: string[]) {
    if (!modulos.length) {
      return [];
    }

    const normalized = modulos.map((modulo) => modulo.toLowerCase());

    return this.plantillasRepository
      .createQueryBuilder('plantilla')
      .where('LOWER(plantilla.modulo) IN (:...modulos)', { modulos: normalized })
      .orderBy('plantilla.modulo', 'ASC')
      .getMany();
  }

  private async loadHallazgosForDraft(equipoId: number | null, mantenimientoId: number | null) {
    const fromDate = this.getIsoDateMonthsAgo(5);
    const byId = new Map<number, Hallazgo>();

    if (mantenimientoId) {
      const current = await this.hallazgosRepository.find({
        where: { mantenimientoId },
        order: { fechaHallazgo: 'DESC' },
      });

      current.forEach((item) => {
        byId.set(item.id, item);
      });
    }

    if (equipoId) {
      const history = await this.hallazgosRepository
        .createQueryBuilder('hallazgo')
        .where('hallazgo.equipoId = :equipoId', { equipoId })
        .andWhere('hallazgo.fechaHallazgo >= :fromDate', { fromDate })
        .orderBy('hallazgo.fechaHallazgo', 'DESC')
        .getMany();

      history.forEach((item) => {
        byId.set(item.id, item);
      });
    }

    return Array.from(byId.values()).sort((a, b) => String(b.fechaHallazgo).localeCompare(String(a.fechaHallazgo)));
  }

  private normalizeModules(body: CreateInformeDto) {
    const rawModules = Array.isArray(body.modulos)
      ? body.modulos
      : [body.modulo].filter((value): value is string => typeof value === 'string');

    const uniqueModules = new Map<string, string>();
    const invalidModules: string[] = [];

    rawModules
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((modulo) => {
        const key = normalizeModuleKey(modulo);
        const allowedModule = ALLOWED_MODULES_BY_KEY.get(key);

        if (!allowedModule) {
          invalidModules.push(modulo);
          return;
        }

        if (!uniqueModules.has(key)) {
          uniqueModules.set(key, allowedModule);
        }
      });

    if (invalidModules.length) {
      throw new BadRequestException(
        `Modulo(s) no permitido(s): ${invalidModules.join(', ')}. Solo se permiten: ${ALLOWED_MODULES.join(', ')}`,
      );
    }

    if (!uniqueModules.size) {
      throw new BadRequestException(`Debes seleccionar al menos un modulo permitido. Opciones: ${ALLOWED_MODULES.join(', ')}`);
    }

    if (uniqueModules.size > 3) {
      throw new BadRequestException('Solo se permiten entre 1 y 3 modulos por mantenimiento.');
    }

    return Array.from(uniqueModules.values());
  }

  private composeIntro(mantenimientoId: number | null, equipo: Equipo | null) {
    const scope: string[] = [];

    if (mantenimientoId) {
      scope.push(`Mantenimiento #${mantenimientoId}`);
    }

    if (equipo) {
      scope.push(`Equipo ${equipo.idEquipo} - ${equipo.nombreEquipo}`);
    }

    const scopeText = scope.length ? ` (${scope.join(' | ')})` : '';
    return `Informe tecnico generado${scopeText}. Este texto puede editarse por completo antes de guardar.`;
  }

  private composeTemplateText(plantillas: Plantilla[]) {
    if (!plantillas.length) {
      return '';
    }

    return plantillas
      .map(
        (plantilla) =>
          `Modulo: ${plantilla.modulo}\n${plantilla.observacionEstandar}`,
      )
      .join('\n\n');
  }

  private composeHallazgosSection(hallazgos: Hallazgo[]) {
    if (!hallazgos.length) {
      return '';
    }

    const abiertos = hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'ABIERTO');
    const pendientes = hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'PENDIENTE');
    const solucionados = hallazgos.filter((item) => this.normalizeEstado(item.estado) === 'SOLUCIONADO');

    const sectionBlocks = [
      this.composeHallazgoSubsection('Hallazgos abiertos', abiertos),
      this.composeHallazgoSubsection('Hallazgos pendientes', pendientes),
      this.composeHallazgoSubsection('Hallazgos solucionados', solucionados),
    ].filter(Boolean);

    if (!sectionBlocks.length) {
      return '';
    }

    return `Seccion de hallazgos (mantenimiento actual y ultimos 5 meses):\n\n${sectionBlocks.join('\n\n')}`;
  }

  private composeHallazgoSubsection(title: string, hallazgos: Hallazgo[]) {
    if (!hallazgos.length) {
      return '';
    }

    const lines = hallazgos.map((item) => {
      const modulo = item.modulo || '-';
      const descripcion = item.descripcionHallazgo || 'Sin descripcion';
      const fecha = item.fechaHallazgo || '-';
      return `- [${fecha}] (${modulo}) ${descripcion}`;
    });

    return `${title}:\n${lines.join('\n')}`;
  }

  private normalizeEstado(value: string | null | undefined) {
    const estado = String(value || '').trim().toUpperCase();
    if (estado === 'CERRADO') {
      return 'SOLUCIONADO';
    }

    if (estado === 'PENDIENTE' || estado === 'SOLUCIONADO' || estado === 'ABIERTO') {
      return estado;
    }

    return 'ABIERTO';
  }

  private async resolveEquipoId(equipoId?: number, equipoCodigo?: string) {
    const normalizedId = this.normalizeOptionalNumber(equipoId);
    if (normalizedId) {
      return normalizedId;
    }

    const code = String(equipoCodigo || '').trim().toUpperCase();
    if (!code) {
      return null;
    }

    const equipo = await this.equiposRepository
      .createQueryBuilder('equipo')
      .where('LOWER(equipo.idEquipo) = :codigo', { codigo: code.toLowerCase() })
      .getOne();

    if (!equipo) {
      throw new BadRequestException(`No existe equipo con codigo ${code}.`);
    }

    return equipo.id;
  }

  private normalizeOptionalText(value?: string) {
    const text = value?.trim();
    return text ? text : null;
  }

  private normalizeOptionalNumber(value?: number) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  }

  private getIsoDateMonthsAgo(months: number) {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - months);
    return date.toISOString().slice(0, 10);
  }

  private toResponse(informe: Informe) {
    return {
      id: informe.id,
      mantenimientoId: this.normalizeNullableId(informe.mantenimientoId),
      equipoId: this.normalizeNullableId(informe.equipoId),
      modulos: this.parseJsonArray(informe.modulosText),
      observaciones: informe.observaciones,
      pendientes: informe.pendientes,
      recomendaciones: informe.recomendaciones,
      fechaGeneracion:
        informe.fechaGeneracion instanceof Date
          ? informe.fechaGeneracion.toISOString()
          : String(informe.fechaGeneracion),
    };
  }

  private parseJsonArray(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private normalizeNullableId(value: number | string | null) {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

function normalizeModuleKey(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}
