import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { CreateInformeDto } from '../common/dto/create-informe.dto';
import { InformesService } from './informes.service';

@Controller('informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get()
  findAll() {
    return this.informesService.findAll();
  }

  @Post('preview')
  preview(@Body() body: CreateInformeDto, @Headers('x-ruta-numero') rutaNumero?: string) {
    return this.informesService.preview(body, rutaNumero);
  }

  @Post()
  create(@Body() body: CreateInformeDto, @Headers('x-ruta-numero') rutaNumero?: string) {
    return this.informesService.create(body, rutaNumero);
  }

  @Patch(':id/finalizar')
  finalize(@Param('id') id: string) {
    return this.informesService.finalize(+id);
  }
}
