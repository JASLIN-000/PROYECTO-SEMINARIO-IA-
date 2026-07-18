import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from '../common/entities/equipo.entity';
import { Mantenimiento } from '../common/entities/mantenimiento.entity';
import { MantenimientosController } from './mantenimientos.controller';
import { MantenimientosService } from './mantenimientos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mantenimiento, Equipo])],
  controllers: [MantenimientosController],
  providers: [MantenimientosService],
  exports: [MantenimientosService],
})
export class MantenimientosModule {}
