import { Repository } from 'typeorm';
import { Hallazgo } from '../common/entities/hallazgo.entity';
export declare class HallazgosService {
    private readonly hallazgosRepository;
    constructor(hallazgosRepository: Repository<Hallazgo>);
    findAll(equipoId?: string, estado?: string): Promise<Hallazgo[]>;
    create(body: any): Promise<any>;
    update(id: number, body: any): Promise<Hallazgo | null>;
}
