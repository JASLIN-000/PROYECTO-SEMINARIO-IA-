import { Repository } from 'typeorm';
import { Plantilla } from '../common/entities/plantilla.entity';
export declare class PlantillasService {
    private readonly plantillasRepository;
    constructor(plantillasRepository: Repository<Plantilla>);
    findAll(modulo?: string): Promise<Plantilla[]>;
}
