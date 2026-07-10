import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HallazgosController } from './hallazgos.controller';
import { HallazgosService } from './hallazgos.service';
import { Hallazgo } from '../common/entities/hallazgo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hallazgo])],
  controllers: [HallazgosController],
  providers: [HallazgosService],
})
export class HallazgosModule {}
