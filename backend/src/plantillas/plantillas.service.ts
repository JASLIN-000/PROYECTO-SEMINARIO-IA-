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
    return this.plantillasRepository
      .createQueryBuilder('plantilla')
      .where(modulo ? 'LOWER(plantilla.modulo) = :modulo' : '1=1', {
        modulo: modulo?.toLowerCase(),
      })
      .getMany()
      .catch(() => []);
  }
}
