export type BackendCalendarContext = {
  date?: string;
  isoDate?: string;
  dateIso?: string;
  isBusinessDay: boolean;
  businessDayIndex: number | null;
  businessDaysInMonth?: number;
  monthStartIso?: string;
  timezone?: string;
  holidays?: string[];
};

export type Equipo = {
  id: number;
  idEquipo: string;
  nombreEquipo: string;
  acuerdoNivelServicioDh: number;
  estado: string;
  rutaNumero: string | null;
  horaAlmuerzo?: string | null;
  historialHallazgosUrl?: string;
  ubicacion?: string;
  modelo?: string;
  tipoMantenimiento?: string;
  horaProgramada?: string;
  ultimoMantenimiento?: string;
  proximoMantenimiento?: string;
  hallazgosAbiertos?: number;
  informesCount?: number;
};

export type EquiposResponse = {
  ok: boolean;
  mensaje: string;
  calendario: BackendCalendarContext;
  equipos: Equipo[];
};

export type CalendarMonthResponse = {
  ok: boolean;
  calendario: BackendCalendarContext;
  diasHabiles: string[];
};

export type HallazgoEstado = 'ABIERTO' | 'PENDIENTE' | 'SOLUCIONADO' | string;

export type Hallazgo = {
  id: number;
  mantenimientoId: number | null;
  tipoMantenimiento: string;
  modulo: string;
  descripcionHallazgo: string;
  cotizacion: string;
  observacion: string | null;
  estado: HallazgoEstado;
  fechaHallazgo: string;
  fechaSolucion: string | null;
  idEquipo: string | null;
  nombreEquipo: string | null;
};

export type Informe = {
  id: number;
  mantenimientoId: number | null;
  equipoId: number | null;
  idEquipo: string | null;
  equipoCodigo?: string | null;
  nombreEquipo: string | null;
  equipoNombre?: string | null;
  modulos: string[];
  observaciones: string;
  pendientes: string | null;
  recomendaciones: string | null;
  fechaGeneracion: string;
  estado?: 'Pendiente' | 'En proceso' | 'Finalizado';
  tecnicoResponsable?: string;
};

export type InformePreview = {
  mantenimientoId: number | null;
  equipoId: number | null;
  equipo: {
    id: number;
    idEquipo: string;
    nombreEquipo: string;
    rutaNumero: string;
  } | null;
  modulos: string[];
  textoGenerado: string;
  resumenHallazgos: {
    total: number;
    abiertos: number;
    pendientes: number;
    solucionados: number;
  };
};

export type Plantilla = {
  id: number;
  modulo: string;
  observacionEstandar: string;
};
