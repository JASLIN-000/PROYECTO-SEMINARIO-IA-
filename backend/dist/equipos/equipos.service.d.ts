import { Repository } from 'typeorm';
import { Equipo } from '../common/entities/equipo.entity';
export declare class EquiposService {
    private readonly equiposRepository;
    constructor(equiposRepository: Repository<Equipo>);
    findAll(q?: string): Promise<Equipo[]>;
}
