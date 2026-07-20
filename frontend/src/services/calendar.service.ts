import { apiClient } from '@/api/client';
import type { CalendarMonthResponse } from '@/types/domain';

export async function fetchBusinessCalendarMonth(fecha?: string) {
  const params = new URLSearchParams();
  if (fecha) {
    params.set('fecha', fecha);
  }

  const query = params.toString();
  const endpoint = query ? `/calendario/mes?${query}` : '/calendario/mes';
  const { data } = await apiClient.get<CalendarMonthResponse>(endpoint);
  return data;
}