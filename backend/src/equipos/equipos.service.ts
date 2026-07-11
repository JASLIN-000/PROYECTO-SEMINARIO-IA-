import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipo } from '../common/entities/equipo.entity';

@Injectable()
export class EquiposService {
  constructor(
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
  ) {}

  async findAll(q?: string) {
    try {
      const query = this.equiposRepository.createQueryBuilder('equipo');

      if (q?.trim()) {
        const term = `%${q.trim().toLowerCase()}%`;
        query.andWhere(
          '(LOWER(equipo.nombreEquipo) LIKE :term OR LOWER(equipo.idEquipo) LIKE :term OR CAST(equipo.id AS text) LIKE :term)',
          { term },
        );
      }

      const equipos = await query.getMany();

      return equipos.map((equipo) => ({
        id: equipo.id,
        idEquipo: equipo.idEquipo,
        nombreEquipo: equipo.nombreEquipo,
        acuerdoNivelServicioDh: equipo.acuerdoNivelServicioDh,
        estado: equipo.estado,
        slaDiasHabiles: equipo.acuerdoNivelServicioDh,
        slaHoras: equipo.acuerdoNivelServicioDh * 24,
        nombre: equipo.nombreEquipo,
        acuerdoNivelServicio: `${equipo.acuerdoNivelServicioDh}DH`,
      }));
    } catch {
      return [];
    }
  }
}
