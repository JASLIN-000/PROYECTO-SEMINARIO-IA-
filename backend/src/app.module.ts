import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EquiposModule } from './equipos/equipos.module';
import { HallazgosModule } from './hallazgos/hallazgos.module';
import { InformesModule } from './informes/informes.module';
import { PlantillasModule } from './plantillas/plantillas.module';
import { Equipo } from './common/entities/equipo.entity';
import { Hallazgo } from './common/entities/hallazgo.entity';
import { Plantilla } from './common/entities/plantilla.entity';
import { Informe } from './common/entities/informe.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'raul123',
      database: process.env.DB_NAME || 'mantenimiento',
      entities: [Equipo, Hallazgo, Plantilla, Informe],
      synchronize: false,
      autoLoadEntities: true,
      logging: false,
    }),
    EquiposModule,
    HallazgosModule,
    InformesModule,
    PlantillasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
