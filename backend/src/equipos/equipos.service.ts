import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Equipo } from '../common/entities/equipo.entity';
import { getBusinessDayContext, loadConfiguredHolidaySet } from '../common/utils/business-days';

type WorkWindow = {
  startMinutes: number;
  endMinutes: number;
};

type MaintenanceSlot = {
  horaInicio: string;
  horaFin: string;
  horaProgramada: string;
};

const DEFAULT_TECNICO = 'Sergio Ramos';
const DEFAULT_INGENIERO = 'William Hernandez';
const DEFAULT_EJECUTIVA = 'Ivon Martinez';
const DEFAULT_TIPO_CONTRATO = 'A';

@Injectable()
export class EquiposService {
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(q?: string, rutaNumero?: string, fecha?: string, todos?: string) {
    await this.ensureSchema();
    await this.normalizeActiveServiceDayIndexes();

    const targetDate = this.parseTargetDate(fecha);
    const holidays = await loadConfiguredHolidaySet(targetDate);
    const calendario = getBusinessDayContext(targetDate, holidays);
    const normalizedRoute = rutaNumero?.trim().toLowerCase();
    const includeAll = this.parseBooleanFlag(todos);

    if (includeAll) {
      const equipos = await this.loadActiveEquipos(normalizedRoute, q);
      const slots = this.buildMaintenanceSlots(equipos.length, targetDate);

      return {
        ok: true,
        mensaje: equipos.length
          ? 'Equipos activos cargados correctamente.'
          : 'No existen equipos activos con los filtros aplicados.',
        calendario,
        equipos: equipos.map((equipo, index) => {
          const slot = slots[index] ?? {
            horaInicio: null,
            horaFin: null,
            horaProgramada: null,
          };

          return this.toEquipoResponse(equipo, slot);
        }),
      };
    }

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

    const slots = this.buildMaintenanceSlots(equipos.length, targetDate);

    const mensaje = equipos.length
      ? 'Equipos programados cargados correctamente.'
      : 'No existen equipos programados para el dia habil actual con los filtros aplicados.';

    return {
      ok: true,
      mensaje,
      calendario,
      equipos: equipos.map((equipo, index) => {
        const slot = slots[index] ?? {
          horaInicio: null,
          horaFin: null,
          horaProgramada: null,
        };

        return this.toEquipoResponse(equipo, slot);
      }),
    };
  }

  private toEquipoResponse(equipo: Equipo, slot: MaintenanceSlot | { horaInicio: null; horaFin: null; horaProgramada: null }) {
    return {
      ...slot,
      horaAlmuerzo: '12:00 - 13:00',
      id: equipo.id,
      idEquipo: equipo.idEquipo,
      nombreEquipo: equipo.nombreEquipo,
      acuerdoNivelServicioDh: equipo.acuerdoNivelServicioDh,
      estado: equipo.estado,
      rutaNumero: equipo.rutaNumero ?? null,
      direccion: equipo.direccion ?? (equipo.rutaNumero ? `Ruta ${equipo.rutaNumero}` : 'Sin direccion registrada'),
      ultimoMantenimiento: equipo.ultimoMantenimiento ?? 'No disponible',
      proximoMantenimiento: equipo.proximoMantenimiento ?? 'Pendiente',
      tecnicoResponsable: equipo.tecnicoResponsable ?? DEFAULT_TECNICO,
      ingenieroResponsable: equipo.ingenieroResponsable ?? DEFAULT_INGENIERO,
      ejecutivaCuenta: equipo.ejecutivaCuenta ?? DEFAULT_EJECUTIVA,
      tipoContrato: equipo.tipoContrato ?? DEFAULT_TIPO_CONTRATO,
      historialHallazgosUrl: `/hallazgos?equipoId=${equipo.id}`,
    };
  }

  private buildMaintenanceSlots(total: number, targetDate: Date): MaintenanceSlot[] {
    if (total <= 0) {
      return [];
    }

    const windows = this.getWorkingWindows(targetDate);
    const totalWorkMinutes = windows.reduce((acc, window) => acc + (window.endMinutes - window.startMinutes), 0);
    const slotWorkMinutes = totalWorkMinutes / total;

    const slots: MaintenanceSlot[] = [];
    for (let index = 0; index < total; index += 1) {
      const startWorkMinute = index * slotWorkMinutes;
      const endWorkMinute = (index + 1) * slotWorkMinutes;

      const startClock = this.workMinuteToClock(startWorkMinute, windows);
      const endClock = this.workMinuteToClock(endWorkMinute, windows);

      const horaInicio = this.formatClock(startClock);
      const horaFin = this.formatClock(endClock);
      const horaProgramada = this.formatProgrammedRange(startClock, endClock, windows);

      slots.push({
        horaInicio,
        horaFin,
        horaProgramada,
      });
    }

    return slots;
  }

  private getWorkingWindows(targetDate: Date): WorkWindow[] {
    const day = targetDate.getUTCDay();
    const isFriday = day === 5;

    return [
      // Manana: 07:30 - 12:00
      { startMinutes: 7 * 60 + 30, endMinutes: 12 * 60 },
      // Tarde: 13:00 - 17:00 (L-J) / 13:00 - 16:30 (V)
      { startMinutes: 13 * 60, endMinutes: isFriday ? 16 * 60 + 30 : 17 * 60 },
    ];
  }

  private workMinuteToClock(workMinute: number, windows: WorkWindow[]) {
    const clamped = Math.max(0, workMinute);
    let remaining = clamped;

    for (const window of windows) {
      const duration = window.endMinutes - window.startMinutes;
      if (remaining <= duration) {
        return window.startMinutes + remaining;
      }

      remaining -= duration;
    }

    return windows[windows.length - 1].endMinutes;
  }

  private formatClock(totalMinutes: number) {
    const rounded = Math.round(totalMinutes);
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private formatProgrammedRange(startClock: number, endClock: number, windows: WorkWindow[]) {
    const start = this.formatClock(startClock);
    const end = this.formatClock(endClock);

    for (let index = 0; index < windows.length - 1; index += 1) {
      const current = windows[index];
      const next = windows[index + 1];
      const breakStart = current.endMinutes;
      const breakEnd = next.startMinutes;

      if (startClock < breakStart && endClock > breakEnd) {
        const beforeBreak = `${start} - ${this.formatClock(breakStart)}`;
        const afterBreak = `${this.formatClock(breakEnd)} - ${end}`;
        return `${beforeBreak} / ${afterBreak}`;
      }
    }

    return `${start} - ${end}`;
  }

  private async loadEquiposByBusinessDayIndex(
    businessDayIndex: number,
    normalizedRoute?: string,
    q?: string,
  ) {
    const query = this.buildActiveEquiposBaseQuery(normalizedRoute, q);
    query.andWhere('equipo.acuerdoNivelServicioDh = :businessDayIndex', {
      businessDayIndex,
    });

    return query.orderBy('equipo.nombreEquipo', 'ASC').getMany();
  }

  private async loadActiveEquipos(normalizedRoute?: string, q?: string) {
    return this.buildActiveEquiposBaseQuery(normalizedRoute, q).orderBy('equipo.nombreEquipo', 'ASC').getMany();
  }

  private buildActiveEquiposBaseQuery(normalizedRoute?: string, q?: string) {
    const query = this.equiposRepository.createQueryBuilder('equipo');
    query.where('UPPER(equipo.estado) = :estado', { estado: 'ACTIVO' });

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

    return query;
  }

  private parseBooleanFlag(value?: string) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'si' || normalized === 'yes';
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
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ultimo_mantenimiento DATE;
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS proximo_mantenimiento DATE;
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS tecnico_responsable VARCHAR(120);
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ingeniero_responsable VARCHAR(120);
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ejecutiva_cuenta VARCHAR(120);
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS tipo_contrato VARCHAR(5);
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
