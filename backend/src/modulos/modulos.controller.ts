import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { ModulosService } from './modulos.service';

@Controller('modulos')
@UseGuards(AuthTokenGuard)
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) {}

  @Get()
  findAll() {
    return this.modulosService.findAll();
  }
}
