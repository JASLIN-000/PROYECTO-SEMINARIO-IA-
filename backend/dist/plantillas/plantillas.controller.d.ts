import { PlantillasService } from './plantillas.service';
export declare class PlantillasController {
    private readonly plantillasService;
    constructor(plantillasService: PlantillasService);
    findAll(modulo?: string): Promise<import("../common/entities/plantilla.entity").Plantilla[]>;
}
