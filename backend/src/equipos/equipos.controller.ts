import { Controller, Get, Query } from '@nestjs/common';
import { EquiposService } from './equipos.service';

@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.equiposService.findAll(q);
  }
}
