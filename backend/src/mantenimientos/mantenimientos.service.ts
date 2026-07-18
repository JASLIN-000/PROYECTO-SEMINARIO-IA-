import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateMantenimientoDto } from '../common/dto/create-mantenimiento.dto';
import { Equipo } from '../common/entities/equipo.entity';
import { Mantenimiento } from '../common/entities/mantenimiento.entity';

@Injectable()
export class MantenimientosService {
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(Mantenimiento)
    private readonly mantenimientosRepository: Repository<Mantenimiento>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(equipoId?: number) {
    await this.ensureSchema();

    const where = equipoId && Number.isFinite(equipoId) && equipoId > 0 ? { equipoId } : {};
    const rows = await this.mantenimientosRepository.find({
      where,
      order: { fechaMantenimiento: 'DESC' },
    });

    return rows.map((item) => ({
      idMantenimiento: item.idMantenimiento,
      equipoId: item.equipoId,
      fechaMantenimiento: item.fechaMantenimiento,
      tipoMantenimiento: item.tipoMantenimiento,
    }));
  }

  async create(body: CreateMantenimientoDto) {
    await this.ensureSchema();

    const equipo = await this.equiposRepository.findOne({ where: { id: body.equipoId } });
    if (!equipo) {
      throw new NotFoundException('El equipo indicado no existe.');
    }

    const tipoMantenimiento = String(body.tipoMantenimiento || 'PREVENTIVO').trim().toUpperCase();
    if (!tipoMantenimiento) {
      throw new BadRequestException('tipoMantenimiento es obligatorio.');
    }

    const entity = this.mantenimientosRepository.create({
      equipoId: body.equipoId,
      fechaMantenimiento: body.fechaMantenimiento,
      tipoMantenimiento,
    });

    const saved = await this.mantenimientosRepository.save(entity);

    return {
      idMantenimiento: saved.idMantenimiento,
      equipoId: saved.equipoId,
      fechaMantenimiento: saved.fechaMantenimiento,
      tipoMantenimiento: saved.tipoMantenimiento,
      equipoCodigo: equipo.idEquipo,
      equipoNombre: equipo.nombreEquipo,
    };
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource
        .query(`
          CREATE TABLE IF NOT EXISTS mantenimientos (
            id_mantenimiento BIGSERIAL PRIMARY KEY,
            equipo_id BIGINT NOT NULL REFERENCES equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            fecha_mantenimiento DATE NOT NULL,
            tipo_mantenimiento VARCHAR(50) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_mantenimientos_equipo_id ON mantenimientos(equipo_id);
          CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos(fecha_mantenimiento DESC);
        `)
        .then(() => undefined);
    }

    await this.schemaReady;
  }
}
