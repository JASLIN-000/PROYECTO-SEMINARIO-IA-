import { apiClient } from '@/api/client';
import type { Informe, InformePreview, InformeSemanal, Plantilla } from '@/types/domain';

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

export async function fetchInformesSemanales() {
  const { data } = await apiClient.get<InformeSemanal[]>('/informes/semanales');
  return data;
}

export async function generateInformeSemanal(force = false) {
  const { data } = await apiClient.post<InformeSemanal>(`/informes/semanales/generar?force=${force ? 'true' : 'false'}`);
  return data;
}

export async function downloadInformeSemanalPdf(id: number) {
  const response = await apiClient.get<Blob>(`/informes/semanales/${id}/pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `informe-semanal-${id}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function openInformeSemanalPdfPreview(id: number) {
  const response = await apiClient.get<Blob>(`/informes/semanales/${id}/pdf-preview`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}

export async function sendInformeSemanalByEmail(
  id: number,
  payload: { to: string; subject?: string; message?: string },
) {
  const { data } = await apiClient.post<{ ok: boolean; mensaje: string; informeId: number; destino: string }>(
    `/informes/semanales/${id}/enviar-correo`,
    payload,
  );

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
