export declare class PlantillasService {
    private readonly plantillas;
    findAll(modulo?: string): {
        id: number;
        modulo: string;
        plantillaObservacion: string;
        plantillaRecomendacion: string;
    }[];
}
