import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBusinessCalendarMonth } from '@/services/calendar.service';
import { fetchEquiposProgramados } from '@/services/equipos.service';
import { fetchHallazgos, type HallazgosFilters } from '@/services/hallazgos.service';
import { fetchInformes } from '@/services/informes.service';
import { normalizeText } from '@/lib/utils';

export function useEquiposProgramados(fechaIso: string, search = '') {
  return useQuery({
    queryKey: ['equipos-programados', fechaIso, search],
    queryFn: () => fetchEquiposProgramados(fechaIso, search),
    retry: 2,
  });
}

export function useEquiposFullText(fechaIso: string, search: string) {
  const query = useQuery({
    queryKey: ['equipos-busqueda', fechaIso, search],
    queryFn: () => fetchEquiposProgramados(fechaIso, search),
    retry: 2,
  });

  const equipos = useMemo(() => {
    const base = query.data?.equipos ?? [];
    const term = normalizeText(search);

    if (!term) {
      return base;
    }

    return base.filter((item) => {
      const haystack = [item.nombreEquipo, item.idEquipo, item.rutaNumero ?? '', item.ubicacion ?? ''].map(normalizeText);
      return haystack.some((part) => part.includes(term));
    });
  }, [query.data?.equipos, search]);

  return {
    ...query,
    equipos,
  };
}

export function useBusinessCalendarMonth(fechaIso: string) {
  return useQuery({
    queryKey: ['business-calendar-month', fechaIso],
    queryFn: () => fetchBusinessCalendarMonth(fechaIso),
    retry: 2,
  });
}

export function useHallazgos(filters: HallazgosFilters) {
  return useQuery({
    queryKey: ['hallazgos', filters],
    queryFn: () => fetchHallazgos(filters),
    retry: 2,
  });
}

export function useInformes() {
  return useQuery({
    queryKey: ['informes'],
    queryFn: fetchInformes,
    retry: 2,
  });
}
