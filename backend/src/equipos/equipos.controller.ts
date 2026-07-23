import { Controller, Get, Query } from '@nestjs/common';
import { EquiposService } from './equipos.service';

@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('rutaNumero') rutaNumero?: string,
    @Query('fecha') fecha?: string,
    @Query('todos') todos?: string,
  ) {
    return this.equiposService.findAll(q, rutaNumero, fecha, todos);
  }
}
