import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HallazgosController } from './hallazgos.controller';
import { HallazgosService } from './hallazgos.service';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import { Equipo } from '../common/entities/equipo.entity';
import { Plantilla } from '../common/entities/plantilla.entity';
import { Solicitud } from '../common/entities/solicitud.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hallazgo, Equipo, Plantilla, Solicitud])],
  controllers: [HallazgosController],
  providers: [HallazgosService],
})
export class HallazgosModule {}
