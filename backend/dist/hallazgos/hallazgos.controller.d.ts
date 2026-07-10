import { HallazgosService } from './hallazgos.service';
export declare class HallazgosController {
    private readonly hallazgosService;
    constructor(hallazgosService: HallazgosService);
    findAll(equipoId?: string, estado?: string): Promise<import("../common/entities/hallazgo.entity").Hallazgo[]>;
    create(body: any): Promise<any>;
    update(id: string, body: any): Promise<import("../common/entities/hallazgo.entity").Hallazgo | null>;
}
