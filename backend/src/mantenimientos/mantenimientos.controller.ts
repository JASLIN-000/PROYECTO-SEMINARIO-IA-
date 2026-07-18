import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateMantenimientoDto } from '../common/dto/create-mantenimiento.dto';
import { MantenimientosService } from './mantenimientos.service';

@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly mantenimientosService: MantenimientosService) {}

  @Get()
  findAll(@Query('equipoId') equipoId?: string) {
    return this.mantenimientosService.findAll(equipoId ? Number(equipoId) : undefined);
  }

  @Post()
  create(@Body() body: CreateMantenimientoDto) {
    return this.mantenimientosService.create(body);
  }
}
