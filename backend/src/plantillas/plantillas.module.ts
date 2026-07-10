import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantillasController } from './plantillas.controller';
import { PlantillasService } from './plantillas.service';
import { Plantilla } from '../common/entities/plantilla.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plantilla])],
  controllers: [PlantillasController],
  providers: [PlantillasService],
})
export class PlantillasModule {}
