import { apiClient } from '@/api/client';
import type { Informe, InformePreview, Plantilla } from '@/types/domain';

export type CreateInformePayload = {
  mantenimientoId?: number;
  equipoId?: number;
  equipoCodigo?: string;
  modulo?: string;
  modulos?: string[];
  hallazgoIds?: number[];
  observaciones?: string;
  pendientes?: string;
};

export async function fetchInformes() {
  const { data } = await apiClient.get<Informe[]>('/informes');

  return data.map((informe) => ({
    ...informe,
    idEquipo: informe.idEquipo ?? informe.equipoCodigo ?? null,
    nombreEquipo: informe.nombreEquipo ?? informe.equipoNombre ?? null,
    estado: normalizeInformeEstado(informe.estado, informe.fechaGeneracion),
    tecnicoResponsable: 'Tecnico ruta',
  }));
}

export async function previewInforme(payload: CreateInformePayload) {
  const { data } = await apiClient.post<InformePreview>('/informes/preview', payload);
  return data;
}

export async function fetchPlantillas() {
  const { data } = await apiClient.get<Plantilla[]>('/plantillas');
  return data;
}

export async function createInforme(payload: CreateInformePayload) {
  const { data } = await apiClient.post<Informe>('/informes', payload);
  return data;
}

export async function finalizeInforme(id: number) {
  const { data } = await apiClient.patch<Informe>(`/informes/${id}/finalizar`);
  return data;
}

function normalizeInformeEstado(estado: string | undefined, fechaGeneracion: string) {
  const normalized = String(estado || '').trim().toUpperCase();
  if (normalized === 'FINALIZADO' || normalized === 'PENDIENTE' || normalized === 'EN PROCESO') {
    return normalized;
  }

  const generatedAt = new Date(fechaGeneracion).getTime();
  const now = Date.now();
  const diff = now - generatedAt;

  if (diff < 1000 * 60 * 60 * 12) {
    return 'EN PROCESO' as const;
  }
  if (diff < 1000 * 60 * 60 * 36) {
    return 'PENDIENTE' as const;
  }
  return 'FINALIZADO' as const;
}
