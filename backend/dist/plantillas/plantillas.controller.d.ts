import { PlantillasService } from './plantillas.service';
export declare class PlantillasController {
    private readonly plantillasService;
    constructor(plantillasService: PlantillasService);
    findAll(modulo?: string): {
        id: number;
        modulo: string;
        plantillaObservacion: string;
        plantillaRecomendacion: string;
    }[];
}
