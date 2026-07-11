import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import {
  moveToNextBusinessDay,
  parseHolidaySet,
  toIsoDate,
} from '../common/utils/business-days';

@Injectable()
export class HallazgosService {
  private readonly holidays = parseHolidaySet(process.env.HOLIDAYS);
  private readonly hallazgosFallback: Array<any> = [];

  constructor(
    @InjectRepository(Hallazgo)
    private readonly hallazgosRepository: Repository<Hallazgo>,
  ) {}

  async findAll(equipoId?: string, estado?: string) {
    try {
      const query = this.hallazgosRepository.createQueryBuilder('hallazgo');

      if (equipoId) {
        query.andWhere('hallazgo.equipoId = :equipoId', { equipoId: Number(equipoId) });
      }

      if (estado) {
        query.andWhere('LOWER(hallazgo.estado) = :estado', {
          estado: estado.toLowerCase(),
        });
      }

      return await query.getMany();
    } catch {
      return this.hallazgosFallback.filter((item) => {
        const byEquipo = equipoId ? item.equipoId === Number(equipoId) : true;
        const byEstado = estado ? String(item.estado).toLowerCase() === estado.toLowerCase() : true;
        return byEquipo && byEstado;
      });
    }
  }

  async create(body: any) {
    const payload = await this.normalizeBusinessRules(body, false);
    try {
      return await this.hallazgosRepository.save(payload);
    } catch {
      const fallback = { id: this.hallazgosFallback.length + 1, ...payload };
      this.hallazgosFallback.push(fallback);
      return fallback;
    }
  }

  async update(id: number, body: any) {
    const payload = await this.normalizeBusinessRules(body, true);
    try {
      const hallazgo = await this.hallazgosRepository.preload({ id, ...payload });
      if (!hallazgo) {
        return null;
      }

      return await this.hallazgosRepository.save(hallazgo);
    } catch {
      const index = this.hallazgosFallback.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      this.hallazgosFallback[index] = { ...this.hallazgosFallback[index], ...payload };
      return this.hallazgosFallback[index];
    }
  }

  private async normalizeBusinessRules(body: any, isPartial: boolean): Promise<any> {
    const payload = { ...body };
    const normalized: Record<string, any> = {};

    if (payload.equipoId !== undefined || payload.equipo_id !== undefined) {
      normalized.equipoId = Number(payload.equipoId ?? payload.equipo_id);
    }

    const tipoMantenimiento = payload.tipoMantenimiento ?? payload.tipo_mantenimiento;
    if (tipoMantenimiento !== undefined) {
      normalized.tipoMantenimiento = String(tipoMantenimiento).trim() || 'PREVENTIVO';
    } else if (!isPartial) {
      normalized.tipoMantenimiento = 'PREVENTIVO';
    }

    const modulo = payload.modulo;
    if (modulo !== undefined) {
      normalized.modulo = String(modulo).trim() || 'GENERAL';
    } else if (!isPartial) {
      normalized.modulo = 'GENERAL';
    }

    const descripcion = payload.descripcionHallazgo ?? payload.descripcion_hallazgo ?? payload.descripcion;
    if (descripcion !== undefined) {
      normalized.descripcionHallazgo = String(descripcion).trim() || 'SIN DESCRIPCION';
    } else if (!isPartial) {
      normalized.descripcionHallazgo = 'SIN DESCRIPCION';
    }

    if (payload.cotizacion !== undefined || payload.requiereCotizacion !== undefined) {
      const rawCotizacion = payload.cotizacion;
      if (rawCotizacion !== undefined) {
        const cotizacion = String(rawCotizacion).trim().toUpperCase();
        normalized.cotizacion = cotizacion === 'SÍ' ? 'SI' : (['SI', 'NO', 'NA', 'N/A'].includes(cotizacion) ? cotizacion.replace('/', '') : 'NA');
      } else {
        normalized.cotizacion = payload.requiereCotizacion ? 'SI' : 'NO';
      }
    } else if (!isPartial) {
      normalized.cotizacion = 'NA';
    }

    if (payload.observacion !== undefined) {
      const observacion = String(payload.observacion).trim();
      normalized.observacion = observacion || null;
    }

    if (payload.estado !== undefined) {
      const estado = String(payload.estado).trim().toUpperCase();
      normalized.estado = estado === 'CERRADO' ? 'SOLUCIONADO' : estado || 'ABIERTO';
    } else if (!isPartial) {
      normalized.estado = 'ABIERTO';
    }

    const rawFechaHallazgo = payload.fechaHallazgo ?? payload.fecha_hallazgo ?? payload.fechaMantenimiento;
    const hasDate = typeof rawFechaHallazgo === 'string' && rawFechaHallazgo.trim();

    if (hasDate) {
      const parsed = new Date(`${rawFechaHallazgo}T00:00:00.000Z`);
      if (!Number.isNaN(parsed.getTime())) {
        const shifted = moveToNextBusinessDay(parsed, this.holidays);
        normalized.fechaHallazgo = toIsoDate(shifted);
      }
    } else if (!isPartial) {
      normalized.fechaHallazgo = toIsoDate(new Date());
    }

    const rawFechaSolucion = payload.fechaSolucion ?? payload.fecha_solucion;
    if (rawFechaSolucion !== undefined) {
      const value = String(rawFechaSolucion).trim();
      normalized.fechaSolucion = value || null;
    } else if (normalized.estado === 'SOLUCIONADO' && !isPartial) {
      normalized.fechaSolucion = toIsoDate(new Date());
    }

    return normalized;
  }
}
