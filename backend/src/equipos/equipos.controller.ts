import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request.interface';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { EquiposService } from './equipos.service';

@Controller('equipos')
@UseGuards(AuthTokenGuard)
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Get('diagnostico/inactivos')
  diagnosticoInactivos(@Req() req?: AuthenticatedRequest) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.equiposService.getInactiveDiagnostics(rutaNumero);
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('fecha') fecha?: string,
    @Query('todos') todos?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.equiposService.findAll(q, rutaNumero, fecha, todos);
  }
}
