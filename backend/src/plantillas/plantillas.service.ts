import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plantilla } from '../common/entities/plantilla.entity';

@Injectable()
export class PlantillasService {
  constructor(
    @InjectRepository(Plantilla)
    private readonly plantillasRepository: Repository<Plantilla>,
  ) {}

  findAll(modulo?: string) {
    const query = this.plantillasRepository.createQueryBuilder('plantilla');

    if (modulo) {
      query.where('LOWER(plantilla.modulo) = :modulo', {
        modulo: modulo.toLowerCase(),
      });
    }

    return query.getMany();
  }
}
