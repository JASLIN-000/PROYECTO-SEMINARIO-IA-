import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';
import { InformesSemanalesService } from './informes-semanales.service';
import { Informe } from '../common/entities/informe.entity';
import { Plantilla } from '../common/entities/plantilla.entity';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import { Equipo } from '../common/entities/equipo.entity';
import { Modulo } from '../common/entities/modulo.entity';
import { InformeSemanal } from '../common/entities/informe-semanal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Informe, InformeSemanal, Plantilla, Hallazgo, Equipo, Modulo])],
  controllers: [InformesController],
  providers: [InformesService, InformesSemanalesService],
})
export class InformesModule {}