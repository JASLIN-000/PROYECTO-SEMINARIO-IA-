import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateInformeDto } from '../common/dto/create-informe.dto';
import { InformesService } from './informes.service';

@Controller('informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get()
  findAll() {
    return this.informesService.findAll();
  }

  @Post()
  create(@Body() body: CreateInformeDto) {
    return this.informesService.create(body);
  }
}
