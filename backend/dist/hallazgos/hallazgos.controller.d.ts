import { HallazgosService } from './hallazgos.service';
export declare class HallazgosController {
    private readonly hallazgosService;
    constructor(hallazgosService: HallazgosService);
    findAll(equipoId?: string, estado?: string): {
        id: number;
        equipoId: number;
        estado: string;
        descripcion: string;
        requiereCotizacion: boolean;
        fechaMantenimiento: string;
    }[];
    create(body: any): any;
    update(id: string, body: any): {
        id: number;
        equipoId: number;
        estado: string;
        descripcion: string;
        requiereCotizacion: boolean;
        fechaMantenimiento: string;
    } | null;
}
