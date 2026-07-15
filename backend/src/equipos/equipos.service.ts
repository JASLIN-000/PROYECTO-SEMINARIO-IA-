import { Injectable } from '@nestjs/common';
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

    try {
      const holidays = getConfiguredHolidaySet();
      const calendarDate = fecha ? new Date(fecha) : new Date();
      const calendario = getBusinessDayContext(calendarDate, holidays);

      if (!calendario.isBusinessDay || calendario.businessDayIndex <= 0) {
        return {
          calendario,
          equipos: [],
        };
      }

      const query = this.equiposRepository.createQueryBuilder('equipo');

      if (rutaNumero?.trim()) {
        query.andWhere('LOWER(equipo.rutaNumero) = :rutaNumero', {
          rutaNumero: rutaNumero.trim().toLowerCase(),
        });
      }

      query.andWhere('equipo.acuerdoNivelServicioDh = :businessDayIndex', {
        businessDayIndex: calendario.businessDayIndex,
      });

      if (q?.trim()) {
        const term = `%${q.trim().toLowerCase()}%`;
        query.andWhere(
          '(LOWER(equipo.nombreEquipo) LIKE :term OR LOWER(equipo.idEquipo) LIKE :term OR CAST(equipo.id AS text) LIKE :term)',
          { term },
        );
      }

      const equipos = await query.getMany();

      return {
        calendario,
        equipos: equipos.map((equipo) => ({
          id: equipo.id,
          idEquipo: equipo.idEquipo,
          nombreEquipo: equipo.nombreEquipo,
          acuerdoNivelServicioDh: equipo.acuerdoNivelServicioDh,
          estado: equipo.estado,
          rutaNumero: equipo.rutaNumero,
          slaDiasHabiles: equipo.acuerdoNivelServicioDh,
          slaHoras: equipo.acuerdoNivelServicioDh * 24,
          nombre: equipo.nombreEquipo,
          acuerdoNivelServicio: `${equipo.acuerdoNivelServicioDh}DH`,
        })),
      };
    } catch {
      return {
        calendario: getBusinessDayContext(new Date(), getConfiguredHolidaySet()),
        equipos: [],
      };
    }
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource.query(`
        ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ruta_numero VARCHAR(20);
        CREATE INDEX IF NOT EXISTS idx_equipos_ruta_numero ON equipos(ruta_numero);
      `).then(() => undefined);
    }

    await this.schemaReady;
  }
}
