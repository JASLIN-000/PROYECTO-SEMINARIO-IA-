import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Equipo } from '../common/entities/equipo.entity';
import { getBusinessDayContext, getConfiguredHolidaySet } from '../common/utils/business-days';

@Injectable()
export class EquiposService {
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(q?: string, rutaNumero?: string, fecha?: string) {
    await this.ensureSchema();

    const targetDate = this.parseTargetDate(fecha);
    const calendario = getBusinessDayContext(targetDate, getConfiguredHolidaySet(targetDate));
    const normalizedRoute = rutaNumero?.trim().toLowerCase();

    if (!calendario.isBusinessDay) {
      return {
        ok: true,
        mensaje: 'Hoy no es dia habil, no hay equipos programados para intervenir.',
        calendario,
        equipos: [],
      };
    }

    const query = this.equiposRepository.createQueryBuilder('equipo');
    query.where('UPPER(equipo.estado) = :estado', { estado: 'ACTIVO' });
    query.andWhere('equipo.acuerdoNivelServicioDh = :businessDayIndex', {
      businessDayIndex: calendario.businessDayIndex,
    });

    if (normalizedRoute) {
      query.andWhere('LOWER(equipo.rutaNumero) = :rutaNumero', { rutaNumero: normalizedRoute });
    }

    if (q?.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(equipo.nombreEquipo) LIKE :term OR LOWER(equipo.idEquipo) LIKE :term OR CAST(equipo.id AS text) LIKE :term)',
        { term },
      );
    }

    const equipos = await query.orderBy('equipo.nombreEquipo', 'ASC').getMany();

    return {
      ok: true,
      mensaje: equipos.length
        ? 'Equipos programados cargados correctamente.'
        : 'No existen equipos programados para el dia habil actual con los filtros aplicados.',
      calendario,
      equipos: equipos.map((equipo) => ({
        id: equipo.id,
        idEquipo: equipo.idEquipo,
        nombreEquipo: equipo.nombreEquipo,
        acuerdoNivelServicioDh: equipo.acuerdoNivelServicioDh,
        estado: equipo.estado,
        rutaNumero: equipo.rutaNumero ?? null,
        historialHallazgosUrl: `/hallazgos?equipoId=${equipo.id}`,
      })),
    };
  }

  private parseTargetDate(fecha?: string) {
    if (!fecha?.trim()) {
      return new Date();
    }

    const value = fecha.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('El parametro fecha debe tener formato YYYY-MM-DD.');
    }

    const parsed = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('El parametro fecha no es valido.');
    }

    return parsed;
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource
        .query(`
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ruta_numero VARCHAR(20);
          CREATE INDEX IF NOT EXISTS idx_equipos_ruta_numero ON equipos(ruta_numero);
        `)
        .then(() => undefined);
    }

    await this.schemaReady;
  }
}
