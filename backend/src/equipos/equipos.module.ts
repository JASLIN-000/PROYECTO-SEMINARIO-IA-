import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { Equipo } from '../common/entities/equipo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Equipo])],
  controllers: [EquiposController],
  providers: [EquiposService],
  exports: [EquiposService],
})
export class EquiposModule {}
