import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CreateInformeDto } from '../common/dto/create-informe.dto';
import { Equipo } from '../common/entities/equipo.entity';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import { Informe } from '../common/entities/informe.entity';
import { Modulo } from '../common/entities/modulo.entity';
import { Plantilla } from '../common/entities/plantilla.entity';
import { getBusinessDayContext, getConfiguredHolidaySet } from '../common/utils/business-days';

const DEFAULT_ALLOWED_MODULES = [
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
    @InjectRepository(Modulo)
    private readonly modulosRepository: Repository<Modulo>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    await this.ensureSchema();

    const informes = await this.informesRepository.find({
      order: { fechaGeneracion: 'DESC' },
    });

    return this.enrichInformesResponse(informes);
  }

  async preview(body: CreateInformeDto, rutaNumero?: string) {
    await this.ensureSchema();
    return this.buildDraft(body, rutaNumero);
  }

  async create(body: CreateInformeDto, rutaNumero?: string) {
    await this.ensureSchema();

    const draft = await this.buildDraft(body, rutaNumero);
    const observaciones = body.observaciones?.trim() || draft.textoGenerado || 'Informe sin plantilla asociada';

    const entity = this.informesRepository.create({
      mantenimientoId: draft.mantenimientoId,
      equipoId: draft.equipoId,
      modulosText: JSON.stringify(draft.modulos),
      observaciones,
      pendientes: this.normalizeOptionalText(body.pendientes),
      recomendaciones: this.normalizeOptionalText(body.recomendaciones),
      fechaGeneracion: new Date(),
    });

    const saved = await this.informesRepository.save(entity);
    const [response] = await this.enrichInformesResponse([saved]);

    return {
      ...response,
      accion: 'creado',
      resumenHallazgos: draft.resumenHallazgos,
    };
  }

  private async buildDraft(body: CreateInformeDto, rutaNumero?: string) {
    const modulos = await this.normalizeModules(body);
    const mantenimientoId = this.normalizeOptionalNumber(body.mantenimientoId);
    const equipoId = await this.resolveEquipoId(body.equipoId, body.equipoCodigo, rutaNumero);
    const equipo = equipoId
      ? await this.equiposRepository.findOne({ where: { id: equipoId } })
      : null;

    const plantillas = await this.loadPlantillas(modulos);
    const textoPlantillas = this.composeTemplateText(plantillas);
    const hallazgos = await this.loadHallazgosForDraft(equipoId, mantenimientoId);
    const seccionHallazgos = this.composeHallazgosSection(hallazgos);

    const blocks = [
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
      const moduloInserts = DEFAULT_ALLOWED_MODULES.map(
        (moduleName) =>
          `INSERT INTO modulos (nombre_modulo) VALUES ('${moduleName.replace(/'/g, "''")}') ON CONFLICT (nombre_modulo) DO NOTHING;`,
      ).join('\n');

      this.schemaReady = this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS modulos (
          id BIGSERIAL PRIMARY KEY,
          nombre_modulo VARCHAR(200) NOT NULL UNIQUE,
          activo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

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

        ${moduloInserts}
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

  private async normalizeModules(body: CreateInformeDto) {
    const rawModules = Array.isArray(body.modulos)
      ? body.modulos
      : [body.modulo].filter((value): value is string => typeof value === 'string');

    const allowedModules = await this.getAllowedModulesCatalog();
    const allowedOptions = Array.from(allowedModules.values());
    const uniqueModules = new Map<string, string>();
    const invalidModules: string[] = [];

    rawModules
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((modulo) => {
        const key = normalizeModuleKey(modulo);
        const allowedModule = allowedModules.get(key);

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
        `Modulo(s) no permitido(s): ${invalidModules.join(', ')}. Solo se permiten: ${allowedOptions.join(', ')}`,
      );
    }

    if (!uniqueModules.size) {
      throw new BadRequestException(`Debes seleccionar al menos un modulo permitido. Opciones: ${allowedOptions.join(', ')}`);
    }

    if (uniqueModules.size > 3) {
      throw new BadRequestException('Solo se permiten entre 1 y 3 modulos por mantenimiento.');
    }

    return Array.from(uniqueModules.values());
  }

  private async getAllowedModulesCatalog() {
    const rows = await this.modulosRepository
      .createQueryBuilder('modulo')
      .where('modulo.activo = :activo', { activo: true })
      .orderBy('modulo.nombreModulo', 'ASC')
      .getMany();

    const source = rows.length ? rows.map((row) => row.nombreModulo) : DEFAULT_ALLOWED_MODULES;
    return new Map(source.map((moduleName) => [normalizeModuleKey(moduleName), moduleName]));
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
      this.composeCotizacionSuggestions(hallazgos),
    ].filter(Boolean);

    if (!sectionBlocks.length) {
      return '';
    }

    return `Seccion de hallazgos\n\n${sectionBlocks.join('\n\n')}`;
  }

  private composeCotizacionSuggestions(hallazgos: Hallazgo[]) {
    const requireCotizacion = hallazgos.filter((item) => String(item.cotizacion || '').trim().toUpperCase() === 'SI');
    if (!requireCotizacion.length) {
      return '';
    }

    const lines = requireCotizacion.map((item) => {
      const fecha = item.fechaHallazgo || '-';
      const modulo = item.modulo || '-';
      const descripcion = item.descripcionHallazgo || 'Sin descripcion';
      return `Se sugiere aprobar cotizacion correspondiente al hallazgo=[${fecha}] (${modulo}) ${descripcion}.`;
    });

    return lines.join('\n');
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

  private async resolveEquipoId(equipoId?: number, equipoCodigo?: string, rutaNumero?: string) {
    const normalizedId = this.normalizeOptionalNumber(equipoId);
    if (normalizedId) {
      const equipo = await this.equiposRepository.findOne({ where: { id: normalizedId } });
      if (!equipo) {
        throw new BadRequestException('Equipo no encontrado.');
      }

      this.assertEquipoProgramadoHoy(equipo, rutaNumero);
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

    this.assertEquipoProgramadoHoy(equipo, rutaNumero);

    return equipo.id;
  }

  private assertEquipoProgramadoHoy(equipo: Equipo, rutaNumero?: string) {
    const today = new Date();
    const calendario = getBusinessDayContext(today, getConfiguredHolidaySet(today));

    if (!calendario.isBusinessDay) {
      throw new BadRequestException('Hoy no es dia habil. Solo se pueden generar informes para equipos programados en dia habil.');
    }

    if (String(equipo.estado || '').trim().toUpperCase() !== 'ACTIVO') {
      throw new BadRequestException('El equipo no esta activo para generar informe.');
    }

    if (equipo.acuerdoNivelServicioDh !== calendario.businessDayIndex) {
      throw new BadRequestException('El equipo no esta programado para el dia habil actual.');
    }

    const normalizedRoute = String(rutaNumero || '').trim().toLowerCase();
    if (normalizedRoute && String(equipo.rutaNumero || '').trim().toLowerCase() !== normalizedRoute) {
      throw new BadRequestException(`El equipo no pertenece a la ruta ${rutaNumero}.`);
    }
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

  private async enrichInformesResponse(informes: Informe[]) {
    if (!informes.length) {
      return [];
    }

    const equipoIds = Array.from(
      new Set(
        informes
          .map((informe) => Number(informe.equipoId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    const equipos = equipoIds.length
      ? await this.equiposRepository.find({ where: { id: In(equipoIds) } })
      : [];

    const equiposById = new Map<number, Equipo>();
    equipos.forEach((equipo) => {
      equiposById.set(equipo.id, equipo);
    });

    return informes.map((informe) => {
      const base = this.toResponse(informe);
      const equipo = equiposById.get(Number(informe.equipoId));
      return {
        ...base,
        equipoCodigo: equipo?.idEquipo ?? null,
        equipoNombre: equipo?.nombreEquipo ?? null,
      };
    });
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
