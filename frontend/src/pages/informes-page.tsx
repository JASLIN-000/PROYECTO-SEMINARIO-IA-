import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ListFilter, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ReportGeneratorDialog } from '@/components/report-generator-dialog';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHallazgos, useInformes } from '@/hooks/use-dashboard';
import { formatDate, getErrorMessage, normalizeText } from '@/lib/utils';
import { fetchEquiposProgramados } from '@/services/equipos.service';
import { fetchPlantillas } from '@/services/informes.service';
import type { Equipo } from '@/types/domain';

export function InformesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [selectionResolved, setSelectionResolved] = useState(false);
  const [manualEquipoInput, setManualEquipoInput] = useState('');
  const [manualLookupError, setManualLookupError] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | 'PENDIENTE' | 'EN PROCESO' | 'FINALIZADO'>('TODOS');

  const equipoIdParam = searchParams.get('equipoId');
  const equipoCodigoParam = searchParams.get('equipoCodigo');
  const fromWorkspaceEntry = searchParams.get('generar') === '1' || Boolean(equipoIdParam || equipoCodigoParam);

  const equiposQuery = useQuery({
    queryKey: ['equipos-workspace-catalog'],
    queryFn: () => fetchEquiposProgramados(undefined, undefined, true),
    retry: 2,
  });
  const equiposCatalog = equiposQuery.data?.equipos ?? [];
  const hallazgosQuery = useHallazgos({});
  const informesQuery = useInformes();
  const plantillasQuery = useQuery({
    queryKey: ['plantillas'],
    queryFn: fetchPlantillas,
    retry: 2,
  });

  useEffect(() => {
    if (!fromWorkspaceEntry || selectionResolved || !equiposCatalog.length) {
      return;
    }

    const match = equiposCatalog.find((equipo) => {
      if (equipoIdParam && Number(equipoIdParam) === equipo.id) {
        return true;
      }

      if (equipoCodigoParam && normalizeText(equipoCodigoParam) === normalizeText(equipo.idEquipo)) {
        return true;
      }

      return false;
    });

    if (match) {
      setSelectedEquipo(match);
    }

    setSelectionResolved(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('generar');
    nextParams.delete('equipoId');
    nextParams.delete('equipoCodigo');
    setSearchParams(nextParams, { replace: true });
  }, [
    equipoCodigoParam,
    equipoIdParam,
    equiposCatalog,
    fromWorkspaceEntry,
    searchParams,
    selectionResolved,
    setSearchParams,
  ]);

  const hasInitialError = equiposQuery.isError || hallazgosQuery.isError || plantillasQuery.isError || informesQuery.isError;
  const isInitialLoading = equiposQuery.isLoading || hallazgosQuery.isLoading || plantillasQuery.isLoading || informesQuery.isLoading;

  const errorMessage = useMemo(() => {
    const sourceError = equiposQuery.error ?? hallazgosQuery.error ?? plantillasQuery.error ?? informesQuery.error;
    return getErrorMessage(sourceError, 'No fue posible cargar el workspace de informes.');
  }, [equiposQuery.error, hallazgosQuery.error, informesQuery.error, plantillasQuery.error]);

  const informes = informesQuery.data ?? [];

  const filteredInformes = useMemo(() => {
    const term = normalizeText(reportSearch);

    return informes
      .filter((item) => {
        const estadoNormalized = String(item.estado || '').trim().toUpperCase();
        if (estadoFilter !== 'TODOS' && estadoNormalized !== estadoFilter) {
          return false;
        }

        if (!term) {
          return true;
        }

        const haystack = [
          item.nombreEquipo ?? '',
          item.idEquipo ?? '',
          estadoNormalized,
          item.modulos.join(' '),
          item.observaciones ?? '',
        ].map(normalizeText);

        return haystack.some((value) => value.includes(term));
      })
      .sort((left, right) => String(right.fechaGeneracion).localeCompare(String(left.fechaGeneracion)));
  }, [estadoFilter, informes, reportSearch]);


  if (isInitialLoading && !selectionResolved) {
    return (
      <section className='space-y-4'>
        <LoadingSpinner label='Preparando workspace de informes...' />
      </section>
    );
  }

  if (hasInitialError) {
    return (
      <section className='space-y-4'>
        <EmptyState title='Error al cargar informes' description={errorMessage} />
        <Button variant='outline' onClick={() => navigate('/')}>
          <ArrowLeft className='mr-2 h-4 w-4' /> Volver a Inicio
        </Button>
      </section>
    );
  }

  if (!selectedEquipo) {
    const handleManualOpen = () => {
      const term = manualEquipoInput.trim();
      if (!term) {
        setManualLookupError('Ingresa un codigo o ID de equipo.');
        return;
      }

      const normalizedTerm = normalizeText(term);
      const parsedId = Number(term);

      const match = equiposCatalog.find((equipo) => {
        if (Number.isFinite(parsedId) && parsedId > 0 && equipo.id === parsedId) {
          return true;
        }

        return normalizeText(equipo.idEquipo) === normalizedTerm;
      });

      if (!match) {
        setManualLookupError('No encontramos un equipo con ese codigo o ID.');
        return;
      }

      setManualLookupError('');
      setSelectedEquipo(match);
    };

    return (
      <section className='space-y-6'>
        <div>
          <h1 className='text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl'>Informes de mantenimiento</h1>
          <p className='mt-1 text-sm text-[#6B7280]'>Consulta, gestiona y genera informes de los equipos.</p>
        </div>

        <Card className='border-black/5'>
          <CardContent className='space-y-3 p-4'>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-4 w-4 text-[#A11D2E]' />
              <h2 className='text-sm font-semibold text-[#111827]'>Generar informe</h2>
            </div>

            <div className='grid gap-2 rounded-xl border border-black/5 bg-[#FCFCFD] p-3 sm:grid-cols-[1fr_auto]'>
              <Input
                value={manualEquipoInput}
                onChange={(event) => {
                  setManualEquipoInput(event.target.value);
                  if (manualLookupError) {
                    setManualLookupError('');
                  }
                }}
                placeholder='Ingresa ID o código del equipo (ej: 1497S-01 o 124)'
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleManualOpen();
                  }
                }}
              />
              <Button onClick={handleManualOpen}>Abrir visual</Button>
            </div>

            {manualLookupError ? <p className='text-xs text-[#C62828]'>{manualLookupError}</p> : null}
          </CardContent>
        </Card>

        <Card className='border-black/5'>
          <CardContent className='space-y-4 p-4'>
            <div className='grid gap-3 xl:grid-cols-[1.6fr_.7fr]'>
              <Input
                value={reportSearch}
                onChange={(event) => setReportSearch(event.target.value)}
                placeholder='Buscar por ID, nombre o estado...'
              />
              <select
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value as 'TODOS' | 'PENDIENTE' | 'EN PROCESO' | 'FINALIZADO')}
                className='h-10 rounded-xl border border-wine-100 bg-white px-3 text-sm text-[#374151]'
              >
                <option value='TODOS'>Estado: Todos</option>
                <option value='PENDIENTE'>Pendiente</option>
                <option value='EN PROCESO'>En proceso</option>
                <option value='FINALIZADO'>Finalizado</option>
              </select>
            </div>

            <div className='flex justify-start'>
              <Button variant='secondary' onClick={() => navigate('/')}>
                <ArrowLeft className='mr-2 h-4 w-4' /> Ir a Inicio
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='border-black/5'>
          <CardContent className='p-0'>
            <div className='flex items-center justify-between border-b border-black/5 px-4 py-3'>
              <h2 className='text-base font-semibold text-[#111827]'>Listado de informes</h2>
              <p className='inline-flex items-center gap-1 text-xs text-[#6B7280]'>
                <ListFilter className='h-3.5 w-3.5' /> {filteredInformes.length} resultados
              </p>
            </div>

            {filteredInformes.length ? (
              <div className='divide-y divide-black/5'>
                {filteredInformes.slice(0, 20).map((item) => {
                  const equipo = item.nombreEquipo ?? item.idEquipo ?? 'Equipo sin nombre';

                  return (
                    <article key={item.id} className='grid gap-3 px-4 py-3 sm:grid-cols-[1.5fr_.9fr_.7fr_auto] sm:items-center'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-[#111827]'>{equipo}</p>
                        <p className='truncate text-xs text-[#6B7280]'>INF-{String(item.id).padStart(6, '0')}</p>
                      </div>

                      <p className='text-xs text-[#6B7280]'>{formatDate(item.fechaGeneracion, 'dd/MM/yyyy HH:mm')}</p>
                      <StatusBadge status={item.estado} />

                      <div className='flex justify-end'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            const candidate = equiposCatalog.find((eq) => {
                              return (
                                normalizeText(eq.idEquipo) === normalizeText(item.idEquipo ?? '') ||
                                (item.equipoId ? eq.id === item.equipoId : false)
                              );
                            });

                            if (candidate) {
                              setSelectedEquipo(candidate);
                            } else {
                              setManualEquipoInput(item.idEquipo ?? '');
                              setManualLookupError('No pudimos resolver ese equipo desde catálogo, valida código y vuelve a intentar.');
                            }
                          }}
                        >
                          Abrir
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className='p-8'>
                <EmptyState title='No hay informes para los filtros aplicados' description='Ajusta búsqueda, estado o tipo para ver resultados.' />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <ReportGeneratorDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setSelectedEquipo(null);
          setManualLookupError('');
        }
      }}
      equipo={selectedEquipo}
      hallazgos={hallazgosQuery.data ?? []}
      plantillas={plantillasQuery.data ?? []}
    />
  );
}
