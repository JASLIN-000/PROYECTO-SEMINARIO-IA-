import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from '../common/entities/equipo.entity';
import { TecnicoAcceso } from '../common/entities/tecnico-acceso.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([TecnicoAcceso, Equipo])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}