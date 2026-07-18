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
    await this.normalizeActiveServiceDayIndexes();

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

    const equipos = await this.loadEquiposByBusinessDayIndex(
      calendario.businessDayIndex,
      normalizedRoute,
      q,
    );

    const mensaje = equipos.length
      ? 'Equipos programados cargados correctamente.'
      : 'No existen equipos programados para el dia habil actual con los filtros aplicados.';

    return {
      ok: true,
      mensaje,
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

  private async loadEquiposByBusinessDayIndex(
    businessDayIndex: number,
    normalizedRoute?: string,
    q?: string,
  ) {
    const query = this.equiposRepository.createQueryBuilder('equipo');
    query.where('UPPER(equipo.estado) = :estado', { estado: 'ACTIVO' });
    query.andWhere('equipo.acuerdoNivelServicioDh = :businessDayIndex', {
      businessDayIndex,
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

    return query.orderBy('equipo.nombreEquipo', 'ASC').getMany();
  }

  private async normalizeActiveServiceDayIndexes() {
    await this.dataSource.query(`
      WITH ranked AS (
        SELECT
          id,
          DENSE_RANK() OVER (
            PARTITION BY LOWER(BTRIM(ruta_numero))
            ORDER BY acuerdo_nivel_servicio_dh
          ) AS normalized_dh
        FROM equipos
        WHERE UPPER(estado) = 'ACTIVO'
          AND ruta_numero IS NOT NULL
          AND BTRIM(ruta_numero) <> ''
          AND acuerdo_nivel_servicio_dh IS NOT NULL
      )
      UPDATE equipos equipo
      SET acuerdo_nivel_servicio_dh = ranked.normalized_dh
      FROM ranked
      WHERE equipo.id = ranked.id
        AND equipo.acuerdo_nivel_servicio_dh IS DISTINCT FROM ranked.normalized_dh;
    `);
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

          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_indexes
              WHERE schemaname = 'public'
                AND tablename = 'equipos'
                AND indexname = 'ux_equipos_id_equipo_ci'
            ) THEN
              IF NOT EXISTS (
                SELECT 1
                FROM (
                  SELECT LOWER(id_equipo) AS id_equipo_norm
                  FROM equipos
                  GROUP BY LOWER(id_equipo)
                  HAVING COUNT(*) > 1
                ) dup
              ) THEN
                CREATE UNIQUE INDEX ux_equipos_id_equipo_ci ON equipos (LOWER(id_equipo));
              END IF;
            END IF;
          END
          $$;
        `)
        .then(() => undefined);
    }

    await this.schemaReady;
  }
}
