import { EquiposService } from './equipos.service';
export declare class EquiposController {
    private readonly equiposService;
    constructor(equiposService: EquiposService);
    findAll(q?: string): {
        idEquipo: number;
        nombreEquipo: string;
        acuerdoNivelServicio: string;
        estado: string;
        diaHabil: boolean;
    }[];
}
