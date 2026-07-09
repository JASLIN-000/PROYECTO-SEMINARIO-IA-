import { Body, Controller, Get, Post } from '@nestjs/common';
import { InformesService } from './informes.service';

@Controller('informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get()
  findAll() {
    return this.informesService.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.informesService.create(body);
  }
}
