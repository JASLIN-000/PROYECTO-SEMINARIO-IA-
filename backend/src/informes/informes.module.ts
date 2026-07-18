import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';
import { Informe } from '../common/entities/informe.entity';
import { Plantilla } from '../common/entities/plantilla.entity';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import { Equipo } from '../common/entities/equipo.entity';
import { Modulo } from '../common/entities/modulo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Informe, Plantilla, Hallazgo, Equipo, Modulo])],
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}