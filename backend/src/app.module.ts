import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EquiposModule } from './equipos/equipos.module';
import { HallazgosModule } from './hallazgos/hallazgos.module';
import { InformesModule } from './informes/informes.module';
import { PlantillasModule } from './plantillas/plantillas.module';

@Module({
  imports: [EquiposModule, HallazgosModule, InformesModule, PlantillasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
