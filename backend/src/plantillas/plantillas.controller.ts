import { Controller, Get, Query } from '@nestjs/common';
import { PlantillasService } from './plantillas.service';

@Controller('plantillas')
export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  @Get()
  findAll(@Query('modulo') modulo?: string) {
    return this.plantillasService.findAll(modulo);
  }
}
