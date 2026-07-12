import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateInformeDto } from '../common/dto/create-informe.dto';
import { Informe } from '../common/entities/informe.entity';
import { Plantilla } from '../common/entities/plantilla.entity';

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
      plantillasAplicadasText: JSON.stringify(
        plantillas.map((plantilla) => ({
          id: plantilla.id,
          modulo: plantilla.modulo,
          observacionEstandar: plantilla.observacionEstandar,
        })),
      ),
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
          plantillas_aplicadas_text TEXT NOT NULL DEFAULT '[]',
          fecha_generacion TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

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

    rawModules
      .map((item) => String(item).trim())
      .filter(Boolean)
      .forEach((modulo) => {
        const key = modulo.toLowerCase();
        if (!uniqueModules.has(key)) {
          uniqueModules.set(key, modulo);
        }
      });

    return Array.from(uniqueModules.values()).slice(0, 3);
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
      plantillasAplicadas: this.parseJsonArray(informe.plantillasAplicadasText),
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
