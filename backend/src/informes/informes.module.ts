import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';
import { Informe } from '../common/entities/informe.entity';
import { Plantilla } from '../common/entities/plantilla.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Informe, Plantilla])],
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}