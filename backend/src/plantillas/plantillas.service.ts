import { Injectable } from '@nestjs/common';

@Injectable()
export class PlantillasService {
  private readonly plantillas = [
    {
      id: 1,
      modulo: 'Electrico',
      plantillaObservacion: 'Se realizó revisión eléctrica del equipo y se verificó el estado general.',
      plantillaRecomendacion: 'Se recomienda mantener vigilancia en el tablero principal.',
    },
    {
      id: 2,
      modulo: 'Mecánico',
      plantillaObservacion: 'Se realizó revisión mecánica del sistema y se registraron hallazgos pendientes.',
      plantillaRecomendacion: 'Se recomienda revisar el estado de lubricación.',
    },
  ];

  findAll(modulo?: string) {
    if (!modulo) {
      return this.plantillas;
    }

    return this.plantillas.filter((item) => item.modulo.toLowerCase() === modulo.toLowerCase());
  }
}
