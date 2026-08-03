import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CreateHallazgoDto } from '../common/dto/create-hallazgo.dto';
import { CreateSolicitudDto } from '../common/dto/create-solicitud.dto';
import { UpdateHallazgoDto } from '../common/dto/update-hallazgo.dto';
import type { AuthenticatedRequest } from '../auth/auth-request.interface';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { HallazgosService } from './hallazgos.service';

@Controller('hallazgos')
@UseGuards(AuthTokenGuard)
export class HallazgosController {
  constructor(private readonly hallazgosService: HallazgosService) {}

  @Get()
  findAll(
    @Query('equipoId') equipoId?: string,
    @Query('estado') estado?: string,
    @Query('modulo') modulo?: string,
    @Query('nombreEquipo') nombreEquipo?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.hallazgosService.findAll(equipoId, estado, modulo, nombreEquipo, rutaNumero);
  }

  @Get('forms/resolve')
  resolveGoogleFormUrl(@Query('url') url?: string) {
    return this.hallazgosService.resolveGoogleFormUrl(url);
  }

  @Get(':id/historial-estados')
  findEstadoHistorial(@Param('id') id: string) {
    return this.hallazgosService.findEstadoHistorial(+id);
  }

  @Get('solicitudes/lista')
  listSolicitudes(@Query('hallazgoIds') hallazgoIds?: string) {
    const ids = String(hallazgoIds || '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    return this.hallazgosService.listSolicitudesByHallazgoIds(ids);
  }

  @Get(':id/solicitudes')
  findSolicitudesByHallazgo(@Param('id') id: string) {
    return this.hallazgosService.findSolicitudesByHallazgo(+id);
  }

  @Post(':id/solicitudes')
  createSolicitud(
    @Param('id') id: string,
    @Body() body: CreateSolicitudDto,
    @Req() req?: AuthenticatedRequest,
  ) {
    return this.hallazgosService.createSolicitud(+id, body, req?.auth?.nombre || req?.auth?.usuario || 'Tecnico ruta');
  }

  @Post()
  create(@Body() body: CreateHallazgoDto, @Req() req?: AuthenticatedRequest) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.hallazgosService.create(body, rutaNumero);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateHallazgoDto, @Req() req?: AuthenticatedRequest) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.hallazgosService.update(+id, body, rutaNumero);
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() body: UpdateHallazgoDto, @Req() req?: AuthenticatedRequest) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.hallazgosService.update(+id, body, rutaNumero);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req?: AuthenticatedRequest) {
    const rutaNumero = req?.auth?.rutaNumero;
    return this.hallazgosService.remove(+id, rutaNumero);
  }

  @Delete()
  removeMany(
    @Query('ids') idsQuery: string | undefined,
    @Body() body: { ids?: number[] },
    @Req() req?: AuthenticatedRequest,
  ) {
    const idsFromQuery = String(idsQuery || '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    const ids = idsFromQuery.length ? idsFromQuery : (body?.ids ?? []);
    const rutaNumero = req?.auth?.rutaNumero;
    return this.hallazgosService.removeMany(ids, rutaNumero);
  }
}
