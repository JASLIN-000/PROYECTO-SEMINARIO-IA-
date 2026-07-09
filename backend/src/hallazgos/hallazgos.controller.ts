import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HallazgosService } from './hallazgos.service';

@Controller('hallazgos')
export class HallazgosController {
  constructor(private readonly hallazgosService: HallazgosService) {}

  @Get()
  findAll(@Query('equipoId') equipoId?: string, @Query('estado') estado?: string) {
    return this.hallazgosService.findAll(equipoId, estado);
  }

  @Post()
  create(@Body() body: any) {
    return this.hallazgosService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.hallazgosService.update(+id, body);
  }
}
