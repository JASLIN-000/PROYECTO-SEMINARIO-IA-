import { apiClient } from '@/api/client';
import type { EquiposResponse } from '@/types/domain';

export async function fetchEquiposProgramados(fecha?: string, q?: string, includeAll = false) {
  const params = new URLSearchParams();
  if (fecha) {
    params.set('fecha', fecha);
  }
  if (q?.trim()) {
    params.set('q', q.trim());
  }
  if (includeAll) {
    params.set('todos', 'true');
  }

  const query = params.toString();
  const endpoint = query ? `/equipos?${query}` : '/equipos';
  const { data } = await apiClient.get<EquiposResponse>(endpoint);
  return data;
}
