import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { CreateMantenimientoDto } from '../common/dto/create-mantenimiento.dto';
import { MantenimientosService } from './mantenimientos.service';

@Controller('mantenimientos')
@UseGuards(AuthTokenGuard)
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
