export declare class EquiposService {
    private readonly equipos;
    findAll(q?: string): {
        idEquipo: number;
        nombreEquipo: string;
        acuerdoNivelServicio: string;
        estado: string;
        diaHabil: boolean;
    }[];
}
