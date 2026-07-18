import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { CreateHallazgoDto } from '../common/dto/create-hallazgo.dto';
import { UpdateHallazgoDto } from '../common/dto/update-hallazgo.dto';
import { HallazgosService } from './hallazgos.service';

@Controller('hallazgos')
export class HallazgosController {
  constructor(private readonly hallazgosService: HallazgosService) {}

  @Get()
  findAll(
    @Query('equipoId') equipoId?: string,
    @Query('estado') estado?: string,
    @Query('modulo') modulo?: string,
    @Query('nombreEquipo') nombreEquipo?: string,
    @Headers('x-ruta-numero') rutaNumero?: string,
  ) {
    return this.hallazgosService.findAll(equipoId, estado, modulo, nombreEquipo, rutaNumero);
  }

  @Get(':id/historial-estados')
  findEstadoHistorial(@Param('id') id: string) {
    return this.hallazgosService.findEstadoHistorial(+id);
  }

  @Post()
  create(@Body() body: CreateHallazgoDto, @Headers('x-ruta-numero') rutaNumero?: string) {
    return this.hallazgosService.create(body, rutaNumero);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateHallazgoDto, @Headers('x-ruta-numero') rutaNumero?: string) {
    return this.hallazgosService.update(+id, body, rutaNumero);
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() body: UpdateHallazgoDto, @Headers('x-ruta-numero') rutaNumero?: string) {
    return this.hallazgosService.update(+id, body, rutaNumero);
  }
}
