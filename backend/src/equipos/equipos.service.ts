import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Equipo } from '../common/entities/equipo.entity';
import {
  getBusinessDayContext,
  loadConfiguredHolidaySet,
} from '../common/utils/business-days';

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

    const targetDate = this.parseTargetDate(fecha);
    const holidays = await loadConfiguredHolidaySet(targetDate);
    const calendario = getBusinessDayContext(targetDate, holidays);
    const normalizedRoute = rutaNumero?.trim().toLowerCase();
    const includeAll = this.parseBooleanFlag(todos);
    const operationalSaturdayWeeks = await this.loadOperationalSaturdayWeeks(normalizedRoute, q);

    if (includeAll) {
      const equipos = await this.loadEquipos(normalizedRoute, q);
      const slotsById = this.buildSlotsByEquipoId(equipos, targetDate);

      return {
        ok: true,
        mensaje: equipos.length
          ? 'Equipos cargados correctamente.'
          : 'No existen equipos con los filtros aplicados.',
        calendario: {
          ...calendario,
          isOperationalDay: calendario.isBusinessDay,
          operationalSaturdayWeeks,
        },
        equipos: equipos.map((equipo) => {
          const slot = slotsById.get(equipo.id) ?? {
            horaInicio: null,
            horaFin: null,
            horaProgramada: null,
          };

          return this.toEquipoResponse(equipo, slot);
        }),
      };
    }

    if (!calendario.isBusinessDay) {
      if (this.isSaturday(targetDate)) {
        const saturdayIndex = this.getSaturdayIndexInMonth(targetDate);
        const saturdayEquipos = await this.loadEquiposBySaturdayIndex(saturdayIndex, normalizedRoute, q);
        const saturdaySlots = this.buildSlotsByEquipoId(saturdayEquipos, targetDate);

        if (saturdayEquipos.length) {
          return {
            ok: true,
            mensaje: `Hoy corresponde al sabado #${saturdayIndex} del mes. Se muestran equipos programados para sabado.`,
            calendario: {
              ...calendario,
              isOperationalDay: true,
              operationalLabel: `Sabado #${saturdayIndex}`,
              operationalSaturdayWeeks,
            },
            equipos: saturdayEquipos.map((equipo) => {
              const slot = saturdaySlots.get(equipo.id) ?? {
                horaInicio: null,
                horaFin: null,
                horaProgramada: null,
              };

              return this.toEquipoResponse(equipo, slot);
            }),
          };
        }

        return {
          ok: true,
          mensaje: `Hoy corresponde al sabado #${saturdayIndex} del mes y no hay equipos programados para sabado con los filtros aplicados.`,
          calendario: {
            ...calendario,
            isOperationalDay: false,
            operationalSaturdayWeeks,
          },
          equipos: [],
        };
      }

      if (targetDate.getUTCDay() === 0) {
        return {
          ok: true,
          mensaje: 'Hoy es domingo y no hay equipos programados para intervenir.',
          calendario: {
            ...calendario,
            isOperationalDay: false,
            operationalSaturdayWeeks,
          },
          equipos: [],
        };
      }

      return {
        ok: true,
        mensaje: 'Hoy no es dia habil, no hay equipos programados para intervenir.',
        calendario: {
          ...calendario,
          isOperationalDay: false,
          operationalSaturdayWeeks,
        },
        equipos: [],
      };
    }

    const equipos = await this.loadEquiposByBusinessDayIndex(
      calendario.businessDayIndex,
      normalizedRoute,
      q,
    );

    const slotsById = this.buildSlotsByEquipoId(equipos, targetDate);

    const mensaje = equipos.length
      ? 'Equipos programados cargados correctamente.'
      : 'No existen equipos programados para el dia habil actual con los filtros aplicados.';

    return {
      ok: true,
      mensaje,
      calendario: {
        ...calendario,
        isOperationalDay: true,
        operationalSaturdayWeeks,
      },
      equipos: equipos.map((equipo) => {
        const slot = slotsById.get(equipo.id) ?? {
          horaInicio: null,
          horaFin: null,
          horaProgramada: null,
        };

        return this.toEquipoResponse(equipo, slot);
      }),
    };
  }

  async getInactiveDiagnostics(rutaNumero?: string) {
    await this.ensureSchema();

    const normalizedRoute = String(rutaNumero ?? '').trim().toLowerCase() || null;
    const globallyInactive = await this.loadInactiveEquipos();
    const visibleInactive = this.filterVisibleForRoute(globallyInactive, normalizedRoute);

    const byDhGlobal = this.groupInactiveByDh(globallyInactive);
    const byDhVisible = this.groupInactiveByDh(visibleInactive);

    return {
      ok: true,
      contextoRuta: normalizedRoute,
      resumen: {
        totalInactivosGlobal: globallyInactive.length,
        totalInactivosVisiblesRuta: visibleInactive.length,
      },
      porDh: {
        global: byDhGlobal,
        visibleRuta: byDhVisible,
      },
      detalle: {
        global: globallyInactive,
        visibleRuta: visibleInactive,
      },
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
      programacionSabadoSemana: equipo.programacionSabadoSemana ?? null,
      historialHallazgosUrl: `/hallazgos?equipoId=${equipo.id}`,
    };
  }

  private isSaturday(date: Date) {
    return date.getUTCDay() === 6;
  }

  private getSaturdayIndexInMonth(date: Date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    let saturdayCount = 0;

    for (let currentDay = 1; currentDay <= day; currentDay += 1) {
      const cursor = new Date(Date.UTC(year, month, currentDay, 12, 0, 0));
      if (cursor.getUTCDay() === 6) {
        saturdayCount += 1;
      }
    }

    return saturdayCount;
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
    const equipos = await this.loadEquipos(normalizedRoute, q);

    return equipos
      .filter((equipo) => {
        const dh = Number(equipo.acuerdoNivelServicioDh);
        if (!Number.isFinite(dh) || dh <= 0) {
          return false;
        }

        return dh === businessDayIndex;
      })
      .sort((left, right) => left.nombreEquipo.localeCompare(right.nombreEquipo));
  }

  private async loadEquipos(normalizedRoute?: string, q?: string) {
    return this.buildEquiposBaseQuery(normalizedRoute, q).orderBy('equipo.nombreEquipo', 'ASC').getMany();
  }

  private async loadOperationalSaturdayWeeks(normalizedRoute?: string, q?: string) {
    const rows = await this.buildEquiposBaseQuery(normalizedRoute, q)
      .select('DISTINCT equipo.programacionSabadoSemana', 'semana')
      .andWhere("UPPER(COALESCE(equipo.estado, '')) = 'ACTIVO'")
      .andWhere('equipo.programacionSabadoSemana IS NOT NULL')
      .orderBy('equipo.programacionSabadoSemana', 'ASC')
      .getRawMany<{ semana: number | string | null }>();

    return rows
      .map((row) => Number(row.semana))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  }

  private async loadEquiposBySaturdayIndex(saturdayIndex: number, normalizedRoute?: string, q?: string) {
    const equipos = await this.loadEquipos(normalizedRoute, q);

    return equipos
      .filter((equipo) => this.isEquipoActivo(equipo.estado))
      .filter((equipo) => Number(equipo.programacionSabadoSemana) === saturdayIndex)
      .sort((left, right) => left.nombreEquipo.localeCompare(right.nombreEquipo));
  }

  private buildEquiposBaseQuery(normalizedRoute?: string, q?: string) {
    const query = this.equiposRepository.createQueryBuilder('equipo');
    query.where('1=1');

    if (normalizedRoute) {
      query.andWhere(
        `(
          LOWER(equipo.rutaNumero) = :rutaNumero
          OR (
            UPPER(COALESCE(equipo.estado, '')) <> 'ACTIVO'
            AND (equipo.rutaNumero IS NULL OR BTRIM(equipo.rutaNumero) = '')
          )
        )`,
        { rutaNumero: normalizedRoute },
      );
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

  private buildSlotsByEquipoId(equipos: Equipo[], targetDate: Date) {
    const activos = equipos.filter((equipo) => this.isEquipoActivo(equipo.estado));
    const activeSlots = this.buildMaintenanceSlots(activos.length, targetDate);
    const slotsById = new Map<number, MaintenanceSlot>();

    activos.forEach((equipo, index) => {
      const slot = activeSlots[index];
      if (slot) {
        slotsById.set(equipo.id, slot);
      }
    });

    return slotsById;
  }

  private isEquipoActivo(estado?: string | null) {
    return String(estado ?? '').trim().toUpperCase() === 'ACTIVO';
  }

  private async loadInactiveEquipos() {
    const rows = await this.equiposRepository
      .createQueryBuilder('equipo')
      .select('equipo.id', 'id')
      .addSelect('equipo.idEquipo', 'idEquipo')
      .addSelect('equipo.nombreEquipo', 'nombreEquipo')
      .addSelect('equipo.estado', 'estado')
      .addSelect('equipo.rutaNumero', 'rutaNumero')
      .addSelect('equipo.acuerdoNivelServicioDh', 'acuerdoNivelServicioDh')
      .where("UPPER(COALESCE(equipo.estado, '')) <> 'ACTIVO'")
      .orderBy('equipo.acuerdoNivelServicioDh', 'ASC')
      .addOrderBy('equipo.id', 'ASC')
      .getRawMany<{
        id: number;
        idEquipo: string;
        nombreEquipo: string;
        estado: string;
        rutaNumero: string | null;
        acuerdoNivelServicioDh: number | null;
      }>();

    return rows.map((row) => ({
      id: Number(row.id),
      idEquipo: row.idEquipo,
      nombreEquipo: row.nombreEquipo,
      estado: row.estado,
      rutaNumero: row.rutaNumero,
      acuerdoNivelServicioDh: row.acuerdoNivelServicioDh === null ? null : Number(row.acuerdoNivelServicioDh),
    }));
  }

  private filterVisibleForRoute(
    equipos: Array<{ rutaNumero: string | null; estado: string; acuerdoNivelServicioDh: number | null }>,
    normalizedRoute: string | null,
  ) {
    if (!normalizedRoute) {
      return equipos;
    }

    return equipos.filter((equipo) => {
      const route = String(equipo.rutaNumero ?? '').trim().toLowerCase();
      if (route === normalizedRoute) {
        return true;
      }

      return String(equipo.estado ?? '').trim().toUpperCase() !== 'ACTIVO' && !route;
    });
  }

  private groupInactiveByDh(
    equipos: Array<{ acuerdoNivelServicioDh: number | null }>,
  ) {
    const map = new Map<string, number>();

    equipos.forEach((equipo) => {
      const key = equipo.acuerdoNivelServicioDh === null ? 'null' : String(equipo.acuerdoNivelServicioDh);
      map.set(key, (map.get(key) ?? 0) + 1);
    });

    return Array.from(map.entries())
      .map(([dh, total]) => ({
        dh: dh === 'null' ? null : Number(dh),
        total,
      }))
      .sort((a, b) => {
        if (a.dh === null) {
          return 1;
        }
        if (b.dh === null) {
          return -1;
        }
        return a.dh - b.dh;
      });
  }

  private parseBooleanFlag(value?: string) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'si' || normalized === 'yes';
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
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS programacion_sabado_semana SMALLINT;
          CREATE INDEX IF NOT EXISTS idx_equipos_ruta_numero ON equipos(ruta_numero);
          CREATE INDEX IF NOT EXISTS idx_equipos_programacion_sabado ON equipos(programacion_sabado_semana);

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
