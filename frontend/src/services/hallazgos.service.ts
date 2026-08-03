import { apiClient } from '@/api/client';
import type { Hallazgo, Solicitud } from '@/types/domain';

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

export type UpdateHallazgoEstado = 'ABIERTO' | 'PENDIENTE' | 'SOLUCIONADO';

export type CreateSolicitudPayload = {
  tipoSolicitud: 'COTIZACION' | 'PEDIDO';
  urlFormulario: string;
  estado?: 'GENERADA' | 'ENVIADA' | 'ATENDIDA' | 'CERRADA';
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

export async function updateHallazgoEstado(id: number, estado: UpdateHallazgoEstado) {
  const payload: { estado: UpdateHallazgoEstado; fechaSolucion?: string } = { estado };

  if (estado === 'SOLUCIONADO') {
    payload.fechaSolucion = new Date().toISOString().slice(0, 10);
  }

  const { data } = await apiClient.patch<Hallazgo>(`/hallazgos/${id}`, payload);
  return data;
}

export async function deleteHallazgo(id: number) {
  const { data } = await apiClient.delete<{ deleted: number; ids: number[] }>(`/hallazgos/${id}`);
  return data;
}

export async function deleteHallazgos(ids: number[]) {
  const uniqueIds = Array.from(new Set((ids || []).filter((value) => Number.isFinite(value) && value > 0)));
  const params = new URLSearchParams();
  params.set('ids', uniqueIds.join(','));
  const { data } = await apiClient.delete<{ deleted: number; ids: number[] }>(`/hallazgos?${params.toString()}`);
  return data;
}

export async function fetchSolicitudesByHallazgo(hallazgoId: number) {
  const { data } = await apiClient.get<Solicitud[]>(`/hallazgos/${hallazgoId}/solicitudes`);
  return data;
}

export async function fetchSolicitudesByHallazgoIds(hallazgoIds: number[]) {
  const ids = Array.from(new Set((hallazgoIds || []).filter((value) => Number.isFinite(value) && value > 0)));
  if (!ids.length) {
    return [] as Solicitud[];
  }

  const params = new URLSearchParams();
  params.set('hallazgoIds', ids.join(','));

  const { data } = await apiClient.get<Solicitud[]>(`/hallazgos/solicitudes/lista?${params.toString()}`);
  return data;
}

export async function createSolicitud(hallazgoId: number, payload: CreateSolicitudPayload) {
  const { data } = await apiClient.post<Solicitud>(`/hallazgos/${hallazgoId}/solicitudes`, payload);
  return data;
}

export async function resolveGoogleFormUrl(url: string) {
  const params = new URLSearchParams();
  params.set('url', url);
  const { data } = await apiClient.get<{ inputUrl: string; resolvedUrl: string; requiresAuth?: boolean }>(`/hallazgos/forms/resolve?${params.toString()}`);
  return data;
}
