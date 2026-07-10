import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hallazgo } from '../common/entities/hallazgo.entity';

@Injectable()
export class HallazgosService {
  constructor(
    @InjectRepository(Hallazgo)
    private readonly hallazgosRepository: Repository<Hallazgo>,
  ) {}

  findAll(equipoId?: string, estado?: string) {
    const query = this.hallazgosRepository.createQueryBuilder('hallazgo');

    if (equipoId) {
      query.andWhere('hallazgo.equipoId = :equipoId', { equipoId: Number(equipoId) });
    }

    if (estado) {
      query.andWhere('LOWER(hallazgo.estado) = :estado', {
        estado: estado.toLowerCase(),
      });
    }

    return query.getMany();
  }

  create(body: any) {
    return this.hallazgosRepository.save(body);
  }

  async update(id: number, body: any) {
    const hallazgo = await this.hallazgosRepository.preload({ id, ...body });
    if (!hallazgo) {
      return null;
    }

    return this.hallazgosRepository.save(hallazgo);
  }
}
