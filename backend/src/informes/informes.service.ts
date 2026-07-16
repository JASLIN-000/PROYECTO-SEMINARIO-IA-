import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateInformeDto } from '../common/dto/create-informe.dto';
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
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    await this.ensureSchema();

    const informes = await this.informesRepository.find({
      order: { fechaGeneracion: 'DESC' },
    });

    return informes.map((informe) => this.toResponse(informe));
  }

  async create(body: CreateInformeDto) {
    await this.ensureSchema();

    const modulos = this.normalizeModules(body);
    const plantillas = await this.loadPlantillas(modulos);
    const textoPlantillas = this.composeTemplateText(plantillas);
    const observaciones = body.observaciones?.trim() || textoPlantillas || 'Informe sin plantilla asociada';

    const informe = this.informesRepository.create({
      mantenimientoId: this.normalizeOptionalNumber(body.mantenimientoId),
      equipoId: this.normalizeOptionalNumber(body.equipoId),
      modulosText: JSON.stringify(modulos),
      observaciones,
      pendientes: this.normalizeOptionalText(body.pendientes),
      recomendaciones: this.normalizeOptionalText(body.recomendaciones),
      fechaGeneracion: new Date(),
    });

    const saved = await this.informesRepository.save(informe);
    return this.toResponse(saved);
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

  private normalizeOptionalText(value?: string) {
    const text = value?.trim();
    return text ? text : null;
  }

  private normalizeOptionalNumber(value?: number) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
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
