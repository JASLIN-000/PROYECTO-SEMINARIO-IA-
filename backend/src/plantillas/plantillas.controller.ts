import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { PlantillasService } from './plantillas.service';

@Controller('plantillas')
@UseGuards(AuthTokenGuard)
export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  @Get()
  findAll(@Query('modulo') modulo?: string) {
    return this.plantillasService.findAll(modulo);
  }
}
