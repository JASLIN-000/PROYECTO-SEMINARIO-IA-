import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Hammer, MapPin, ScanSearch } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { StatusBadge } from '@/components/status-badge';
import { useBusinessCalendarMonth, useEquiposFullText, useHallazgos, useInformes } from '@/hooks/use-dashboard';
import type { Equipo } from '@/types/domain';
import { toIsoDate } from '@/utils/business-days';

export function SearchEquiposPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Equipo | null>(null);
  const todayIso = toIsoDate(new Date());
  const query = useEquiposFullText(todayIso, search);
  const businessCalendarQuery = useBusinessCalendarMonth(todayIso);
  const hallazgosQuery = useHallazgos({});
  const informesQuery = useInformes();

  const scheduledDates = useMemo(() => {
    if (!selected?.acuerdoNivelServicioDh || !businessCalendarQuery.data?.diasHabiles?.length) {
      return [] as Date[];
    }

    const index = selected.acuerdoNivelServicioDh - 1;
    const isoDate = businessCalendarQuery.data.diasHabiles[index];
    if (!isoDate) {
      return [] as Date[];
    }

    return [new Date(`${isoDate}T12:00:00-05:00`)];
  }, [businessCalendarQuery.data?.diasHabiles, selected?.acuerdoNivelServicioDh]);

  const selectedMetrics = useMemo(() => {
    if (!selected) {
      return {
        abiertos: 0,
        pendientes: 0,
        solucionados: 0,
        mantenimientosRealizados: 0,
      };
    }

    const hallazgos = (hallazgosQuery.data ?? []).filter((item) => item.idEquipo === selected.idEquipo);
    const informes = (informesQuery.data ?? []).filter(
      (item) => item.idEquipo === selected.idEquipo || item.equipoId === selected.id,
    );

    return {
      abiertos: hallazgos.filter((item) => String(item.estado).toUpperCase() === 'ABIERTO').length,
      pendientes: hallazgos.filter((item) => String(item.estado).toUpperCase() === 'PENDIENTE').length,
      solucionados: hallazgos.filter((item) => String(item.estado).toUpperCase() === 'SOLUCIONADO').length,
      mantenimientosRealizados: informes.length,
    };
  }, [hallazgosQuery.data, informesQuery.data, selected]);

  return (
    <section className='space-y-6'>
      <PageHeader
        title='Buscar equipos'
        description='Filtra por nombre, codigo o ubicacion y consulta informacion detallada del activo.'
      />

      <Card>
        <CardContent className='p-4'>
          <SearchBar value={search} onChange={setSearch} placeholder='Buscar por nombre, codigo o ruta...' />
        </CardContent>
      </Card>

      {query.isLoading ? <LoadingSpinner label='Cargando equipos...' /> : null}
      {query.isError ? (
        <EmptyState title='Error consultando equipos' description='No se pudo completar la busqueda.' />
      ) : null}

      {!query.isLoading && !query.isError ? (
        query.equipos.length ? (
          <div className='grid gap-3 md:grid-cols-2'>
            {query.equipos.map((equipo) => (
              <Card key={equipo.id} className='border-wine-100'>
                <CardContent className='space-y-4 p-4'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <h3 className='font-display font-semibold text-wine-900'>{equipo.nombreEquipo}</h3>
                      <p className='text-sm text-slate-500'>{equipo.idEquipo}</p>
                    </div>
                    <StatusBadge status={equipo.estado} />
                  </div>

                  <p className='flex items-center gap-2 text-sm text-slate-600'>
                    <MapPin className='h-4 w-4 text-wine-700' /> Ruta: {equipo.rutaNumero ?? '-'}
                  </p>

                  <Button variant='outline' size='sm' onClick={() => setSelected(equipo)}>
                    Ver informacion
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title='No se encontraron equipos' description='Ajusta los filtros e intenta nuevamente.' />
        )
      ) : null}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected ? (
            <div className='space-y-5'>
              <div>
                <h3 className='font-display text-xl font-semibold text-wine-900'>{selected.nombreEquipo}</h3>
                <p className='text-sm text-slate-500'>Codigo: {selected.idEquipo}</p>
              </div>

              <div className='grid gap-3 text-sm text-slate-600'>
                <p className='flex items-center gap-2'>
                  <ScanSearch className='h-4 w-4 text-wine-700' /> Modelo: {selected.modelo ?? 'No disponible'}
                </p>
                <p className='flex items-center gap-2'>
                  <MapPin className='h-4 w-4 text-wine-700' /> Ubicacion: {selected.ubicacion ?? `Ruta ${selected.rutaNumero ?? '-'}`}
                </p>
                <p className='flex items-center gap-2'>
                  <Hammer className='h-4 w-4 text-wine-700' /> Ultimo mantenimiento: {selected.ultimoMantenimiento ?? 'No disponible'}
                </p>
                <p className='flex items-center gap-2'>
                  <CalendarClock className='h-4 w-4 text-wine-700' /> Proximo mantenimiento: {selected.proximoMantenimiento ?? 'Pendiente'}
                </p>
                <p>
                  <strong>Hora de almuerzo:</strong> {selected.horaAlmuerzo ?? '12:00 - 13:00'}
                </p>
                <p>Hallazgos abiertos: {selectedMetrics.abiertos}</p>
                <p>Hallazgos pendientes: {selectedMetrics.pendientes}</p>
                <p>Hallazgos solucionados: {selectedMetrics.solucionados}</p>
                <p>Mantenimientos realizados: {selectedMetrics.mantenimientosRealizados}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Calendario mensual</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar mode='multiple' selected={scheduledDates} />
                </CardContent>
              </Card>

              <Button
                onClick={() => {
                  navigate(`/informes?equipoId=${selected.id}&equipoCodigo=${encodeURIComponent(selected.idEquipo)}`);
                  setSelected(null);
                }}
              >
                Generar informe
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
