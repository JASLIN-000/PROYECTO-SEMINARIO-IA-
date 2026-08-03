import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Hammer, MapPin, ScanSearch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { StatusBadge } from '@/components/status-badge';
import { useEquiposFullText, useHallazgos, useInformes } from '@/hooks/use-dashboard';
import type { Equipo } from '@/types/domain';
import { toIsoDate } from '@/utils/business-days';

export function SearchEquiposPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Equipo | null>(null);
  const todayIso = toIsoDate(new Date());
  const query = useEquiposFullText(todayIso, search);
  const hallazgosQuery = useHallazgos({});
  const informesQuery = useInformes();

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
          <div className='space-y-3'>
            {query.equipos.map((equipo) => (
              <Card key={equipo.id} className='border-wine-100'>
                <CardContent className='p-4'>
                  <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                    <div className='min-w-0'>
                      <h3 className='font-display font-semibold text-wine-900'>{equipo.nombreEquipo}</h3>
                      <p className='text-sm text-slate-500'>{equipo.idEquipo}</p>
                    </div>
                    <div className='flex flex-wrap items-center gap-3'>
                      <p className='flex items-center gap-2 text-sm text-slate-600'>
                        <MapPin className='h-4 w-4 text-wine-700' /> Ruta: {equipo.rutaNumero ?? '-'}
                      </p>
                      <StatusBadge status={equipo.estado} />
                      <Button variant='outline' size='sm' onClick={() => setSelected(equipo)}>
                        Ver informacion
                      </Button>
                    </div>
                  </div>
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

              <ul className='grid gap-3 text-sm text-slate-600'>
                <li className='flex items-center gap-2'>
                  <ScanSearch className='h-4 w-4 text-wine-700' /> Modelo: {selected.modelo ?? 'No disponible'}
                </li>
                <li className='flex items-center gap-2'>
                  <MapPin className='h-4 w-4 text-wine-700' /> Direccion: {selected.direccion ?? selected.ubicacion ?? `Ruta ${selected.rutaNumero ?? '-'}`}
                </li>
                <li className='flex items-center gap-2'>
                  <Hammer className='h-4 w-4 text-wine-700' /> Ultimo mantenimiento: {selected.ultimoMantenimiento ?? 'No disponible'}
                </li>
                <li className='flex items-center gap-2'>
                  <CalendarClock className='h-4 w-4 text-wine-700' /> Proximo mantenimiento: {selected.proximoMantenimiento ?? 'Pendiente'}
                </li>
                <li>
                  <strong>Tecnico:</strong> {selected.tecnicoResponsable ?? 'Sergio Ramos'}
                </li>
                <li>
                  <strong>Ingeniero:</strong> {selected.ingenieroResponsable ?? 'William Hernandez'}
                </li>
                <li>
                  <strong>Ejecutiva de cuenta:</strong> {selected.ejecutivaCuenta ?? 'Ivon Martinez'}
                </li>
                <li>
                  <strong>Tipo de contrato:</strong> {selected.tipoContrato ?? 'A'}
                </li>
                <li>
                  <strong>Administracion:</strong> {selected.administracion ?? ''}
                </li>
                <li>
                  <strong>Numero de contacto:</strong> {selected.numeroContacto ?? ''}
                </li>
                <li>
                  <strong>Hora de almuerzo:</strong> {selected.horaAlmuerzo ?? '12:00 - 13:00'}
                </li>
                <li>Hallazgos abiertos: {selectedMetrics.abiertos}</li>
                <li>Hallazgos pendientes: {selectedMetrics.pendientes}</li>
                <li>Hallazgos solucionados: {selectedMetrics.solucionados}</li>
                <li>Mantenimientos realizados: {selectedMetrics.mantenimientosRealizados}</li>
              </ul>

              <Button
                onClick={() => {
                  if (String(selected.estado || '').trim().toUpperCase() !== 'ACTIVO') {
                    return;
                  }

                  navigate(`/informes?equipoId=${selected.id}&equipoCodigo=${encodeURIComponent(selected.idEquipo)}`);
                  setSelected(null);
                }}
                disabled={String(selected.estado || '').trim().toUpperCase() !== 'ACTIVO'}
              >
                {String(selected.estado || '').trim().toUpperCase() === 'ACTIVO' ? 'Generar informe' : 'INACTIVO'}
              </Button>

              <Button
                variant='outline'
                onClick={() => {
                  navigate(`/hallazgos?equipoId=${encodeURIComponent(selected.idEquipo)}`);
                  setSelected(null);
                }}
              >
                Ver historial
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
