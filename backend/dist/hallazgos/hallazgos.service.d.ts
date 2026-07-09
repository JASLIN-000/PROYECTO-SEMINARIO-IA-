export declare class HallazgosService {
    private readonly hallazgos;
    findAll(equipoId?: string, estado?: string): {
        id: number;
        equipoId: number;
        estado: string;
        descripcion: string;
        requiereCotizacion: boolean;
        fechaMantenimiento: string;
    }[];
    create(body: any): any;
    update(id: number, body: any): {
        id: number;
        equipoId: number;
        estado: string;
        descripcion: string;
        requiereCotizacion: boolean;
        fechaMantenimiento: string;
    } | null;
}
