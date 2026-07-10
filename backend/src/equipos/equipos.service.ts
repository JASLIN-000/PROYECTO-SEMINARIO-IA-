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

  findAll(q?: string) {
    const query = this.equiposRepository.createQueryBuilder('equipo');
    query.where('equipo.diaHabil = :diaHabil', { diaHabil: true });

    if (q?.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(equipo.nombre) LIKE :term OR CAST(equipo.id AS text) LIKE :term)',
        { term },
      );
    }

    return query.getMany();
  }
}
