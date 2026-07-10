import { EquiposService } from './equipos.service';
export declare class EquiposController {
    private readonly equiposService;
    constructor(equiposService: EquiposService);
    findAll(q?: string): Promise<import("../common/entities/equipo.entity").Equipo[]>;
}
