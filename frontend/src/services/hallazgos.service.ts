import { apiClient } from '@/api/client';
import type { Hallazgo } from '@/types/domain';

export type CreateHallazgoPayload = {
  equipoId: string;
  tipoMantenimiento: string;
  modulo: string;
  descripcionHallazgo: string;
  cotizacion: 'SI' | 'NO' | 'NA';
  observacion?: string;
  estado?: 'ABIERTO' | 'PENDIENTE' | 'SOLUCIONADO';
  fechaHallazgo?: string;
  mantenimientoId?: number;
};

export type HallazgosFilters = {
  equipoId?: string;
  estado?: string;
  modulo?: string;
  nombreEquipo?: string;
};

export async function fetchHallazgos(filters: HallazgosFilters) {
  const params = new URLSearchParams();

  if (filters.equipoId?.trim()) {
    params.set('equipoId', filters.equipoId.trim());
  }
  if (filters.estado?.trim()) {
    params.set('estado', filters.estado.trim());
  }
  if (filters.modulo?.trim()) {
    params.set('modulo', filters.modulo.trim());
  }
  if (filters.nombreEquipo?.trim()) {
    params.set('nombreEquipo', filters.nombreEquipo.trim());
  }

  const query = params.toString();
  const endpoint = query ? `/hallazgos?${query}` : '/hallazgos';

  const { data } = await apiClient.get<Hallazgo[]>(endpoint);
  return data;
}

export async function createHallazgo(payload: CreateHallazgoPayload) {
  const { data } = await apiClient.post<Hallazgo>('/hallazgos', payload);
  return data;
}
