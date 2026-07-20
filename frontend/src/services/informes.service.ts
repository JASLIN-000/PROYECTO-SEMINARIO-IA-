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
  recomendaciones?: string;
};

export async function fetchInformes() {
  const { data } = await apiClient.get<Informe[]>('/informes');

  return data.map((informe) => ({
    ...informe,
    idEquipo: informe.idEquipo ?? informe.equipoCodigo ?? null,
    nombreEquipo: informe.nombreEquipo ?? informe.equipoNombre ?? null,
    estado: inferEstado(informe.fechaGeneracion),
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

function inferEstado(fechaGeneracion: string) {
  const generatedAt = new Date(fechaGeneracion).getTime();
  const now = Date.now();
  const diff = now - generatedAt;

  if (diff < 1000 * 60 * 60 * 12) {
    return 'En proceso' as const;
  }
  if (diff < 1000 * 60 * 60 * 36) {
    return 'Pendiente' as const;
  }
  return 'Finalizado' as const;
}
