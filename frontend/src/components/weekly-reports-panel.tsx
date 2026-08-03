import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Mail, Printer, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInformesSemanales } from '@/hooks/use-dashboard';
import { formatDate, getErrorMessage, normalizeText } from '@/lib/utils';
import {
  downloadInformeSemanalPdf,
  generateInformeSemanal,
  openInformeSemanalPdfPreview,
  sendInformeSemanalByEmail,
} from '@/services/informes.service';

const FINDINGS_PAGE_SIZE = 5;

type WeeklySort = 'RECENT' | 'PENDIENTE_FIRST' | 'EQUIPO';

export function WeeklyReportsPanel() {
  const queryClient = useQueryClient();
  const weeklyQuery = useInformesSemanales();

  const [weeklyStatusMessage, setWeeklyStatusMessage] = useState('');
  const [showWeeklyPanel, setShowWeeklyPanel] = useState(true);
  const [expandedWeeklyId, setExpandedWeeklyId] = useState<number | null>(null);
  const [weeklyFindingsSearch, setWeeklyFindingsSearch] = useState('');
  const [weeklyFindingsEstado, setWeeklyFindingsEstado] = useState<'TODOS' | 'PENDIENTE' | 'SOLUCIONADO' | 'EN_PROCESO'>('TODOS');
  const [weeklyFindingsSort, setWeeklyFindingsSort] = useState<WeeklySort>('RECENT');
  const [weeklyFindingsPage, setWeeklyFindingsPage] = useState(1);

  const informesSemanales = useMemo(() => weeklyQuery.data ?? [], [weeklyQuery.data]);

  const generateWeeklyMutation = useMutation({
    mutationFn: (force: boolean) => generateInformeSemanal(force),
    onSuccess: (result) => {
      setWeeklyStatusMessage(
        result.accion === 'reutilizado'
          ? 'Ya existia un informe semanal para este periodo. Se reutilizo el ultimo generado.'
          : 'Informe semanal generado correctamente.',
      );
      queryClient.invalidateQueries({ queryKey: ['informes-semanales'] });
    },
    onError: (error) => {
      setWeeklyStatusMessage(getErrorMessage(error, 'No se pudo generar el informe semanal.'));
    },
  });

  const sendWeeklyEmailMutation = useMutation({
    mutationFn: ({ id, to }: { id: number; to: string }) => sendInformeSemanalByEmail(id, { to }),
    onSuccess: (result) => {
      setWeeklyStatusMessage(`Correo enviado a ${result.destino}.`);
    },
    onError: (error) => {
      setWeeklyStatusMessage(getErrorMessage(error, 'No se pudo enviar el correo del informe semanal.'));
    },
  });

  const normalizeWeeklyEstado = (value: string) => {
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'CERRADO') {
      return 'SOLUCIONADO';
    }
    if (raw === 'EN PROCESO') {
      return 'EN_PROCESO';
    }
    if (raw === 'PENDIENTE' || raw === 'SOLUCIONADO' || raw === 'EN_PROCESO') {
      return raw;
    }
    return 'EN_PROCESO';
  };

  const weeklyEstadoStyle = (estado: string) => {
    const normalized = normalizeWeeklyEstado(estado);
    if (normalized === 'SOLUCIONADO') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (normalized === 'PENDIENTE') {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const resolveEstadoWeight = (estado: string) => {
    const normalized = normalizeWeeklyEstado(estado);
    if (normalized === 'PENDIENTE') {
      return 0;
    }
    if (normalized === 'EN_PROCESO') {
      return 1;
    }
    return 2;
  };

  if (weeklyQuery.isLoading) {
    return (
      <Card className='border-black/5'>
        <CardContent className='p-4'>
          <p className='text-sm text-[#6B7280]'>Cargando informes semanales...</p>
        </CardContent>
      </Card>
    );
  }

  if (weeklyQuery.isError) {
    return (
      <Card className='border-black/5'>
        <CardContent className='p-4'>
          <EmptyState title='No fue posible cargar informes semanales' description='Intenta nuevamente.' />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-black/5'>
      <CardContent className='space-y-4 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-sm font-medium text-[#374151]'>Informe semanal automatico</h2>
            <p className='text-xs text-[#6B7280]'>Viernes 4:00 PM (Colombia)</p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => generateWeeklyMutation.mutate(false)}
              disabled={generateWeeklyMutation.isPending}
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              {generateWeeklyMutation.isPending ? 'Generando...' : 'Generar'}
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => generateWeeklyMutation.mutate(true)}
              disabled={generateWeeklyMutation.isPending}
            >
              Regenerar
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setShowWeeklyPanel((value) => !value)}
            >
              {showWeeklyPanel ? 'Ocultar historial semanal' : 'Ver historial semanal'}
            </Button>
          </div>
        </div>

        {weeklyStatusMessage ? <p className='rounded-lg bg-[#F8F9FB] px-3 py-2 text-xs text-[#374151]'>{weeklyStatusMessage}</p> : null}

        {showWeeklyPanel ? (
          informesSemanales.length ? (
            <div className='divide-y divide-black/5 rounded-xl border border-black/5 bg-white'>
              {informesSemanales.slice(0, 8).map((item) => {
                const expanded = expandedWeeklyId === item.id;
                const hallazgosReportados = item.hallazgosReportados ?? [];
                const findingsTerm = normalizeText(weeklyFindingsSearch);
                const filteredHallazgos = hallazgosReportados
                  .filter((hallazgo) => {
                    const estadoNormalized = normalizeWeeklyEstado(hallazgo.estado);
                    if (weeklyFindingsEstado !== 'TODOS' && estadoNormalized !== weeklyFindingsEstado) {
                      return false;
                    }

                    if (!findingsTerm) {
                      return true;
                    }

                    const haystack = [
                      hallazgo.equipoCodigo,
                      hallazgo.equipoNombre,
                      hallazgo.modulo,
                      hallazgo.descripcion,
                      estadoNormalized,
                    ]
                      .map(normalizeText)
                      .join(' ');

                    return haystack.includes(findingsTerm);
                  })
                  .sort((a, b) => {
                    if (weeklyFindingsSort === 'PENDIENTE_FIRST') {
                      const diff = resolveEstadoWeight(a.estado) - resolveEstadoWeight(b.estado);
                      if (diff !== 0) {
                        return diff;
                      }
                    }

                    if (weeklyFindingsSort === 'EQUIPO') {
                      const team = a.equipoNombre.localeCompare(b.equipoNombre);
                      if (team !== 0) {
                        return team;
                      }
                    }

                    if (b.fecha !== a.fecha) {
                      return b.fecha.localeCompare(a.fecha);
                    }
                    return b.id - a.id;
                  });

                const totalPendientes = hallazgosReportados.filter((h) => normalizeWeeklyEstado(h.estado) === 'PENDIENTE').length;
                const totalSolucionados = hallazgosReportados.filter((h) => normalizeWeeklyEstado(h.estado) === 'SOLUCIONADO').length;
                const totalEnProceso = hallazgosReportados.filter((h) => normalizeWeeklyEstado(h.estado) === 'EN_PROCESO').length;

                const totalPages = Math.max(1, Math.ceil(filteredHallazgos.length / FINDINGS_PAGE_SIZE));
                const currentPage = Math.min(weeklyFindingsPage, totalPages);
                const start = (currentPage - 1) * FINDINGS_PAGE_SIZE;
                const pagedHallazgos = filteredHallazgos.slice(start, start + FINDINGS_PAGE_SIZE);

                return (
                  <div key={item.id}>
                    <article className='grid gap-3 px-3 py-3 md:grid-cols-[1.8fr_1.2fr_auto] md:items-center'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-[#111827]'>
                          Semana {item.semanaInicio} a {item.semanaFin}
                        </p>
                        <p className='truncate text-xs text-[#6B7280]'>
                          {formatDate(item.fechaGeneracion, 'dd/MM/yyyy HH:mm')} · {item.tecnicoScope} · {item.pdf.nombreArchivo}
                        </p>
                      </div>

                      <StatusBadge status={item.estado} />

                      <div className='flex flex-wrap justify-end gap-2'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => {
                            setExpandedWeeklyId(expanded ? null : item.id);
                            setWeeklyFindingsPage(1);
                            setWeeklyFindingsSearch('');
                            setWeeklyFindingsEstado('TODOS');
                            setWeeklyFindingsSort('RECENT');
                          }}
                        >
                          {expanded ? 'Ocultar hallazgos' : `Ver hallazgos (${hallazgosReportados.length})`}
                        </Button>

                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            downloadInformeSemanalPdf(item.id).catch((error: unknown) => {
                              setWeeklyStatusMessage(getErrorMessage(error, 'No se pudo descargar el PDF semanal.'));
                            });
                          }}
                        >
                          <Download className='mr-1.5 h-3.5 w-3.5' /> Descargar
                        </Button>

                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            openInformeSemanalPdfPreview(item.id).catch((error: unknown) => {
                              setWeeklyStatusMessage(getErrorMessage(error, 'No se pudo abrir vista previa para impresion.'));
                            });
                          }}
                        >
                          <Printer className='mr-1.5 h-3.5 w-3.5' /> Imprimir
                        </Button>

                        <Button
                          size='sm'
                          variant='outline'
                          disabled={sendWeeklyEmailMutation.isPending}
                          onClick={() => {
                            const to = window.prompt('Correo destino para enviar el informe semanal:');
                            if (!to?.trim()) {
                              return;
                            }

                            sendWeeklyEmailMutation.mutate({ id: item.id, to: to.trim() });
                          }}
                        >
                          <Mail className='mr-1.5 h-3.5 w-3.5' /> Enviar correo
                        </Button>
                      </div>
                    </article>

                    {expanded ? (
                      <div className='border-t border-black/5 bg-[#FAFAFB] px-3 py-3'>
                        {hallazgosReportados.length ? (
                          <div className='space-y-3'>
                            <div className='grid gap-2 sm:grid-cols-3'>
                              <div className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2'>
                                <p className='text-[11px] font-medium text-rose-700'>Pendientes</p>
                                <p className='text-base font-semibold text-rose-800'>{totalPendientes}</p>
                              </div>
                              <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2'>
                                <p className='text-[11px] font-medium text-emerald-700'>Solucionados</p>
                                <p className='text-base font-semibold text-emerald-800'>{totalSolucionados}</p>
                              </div>
                              <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2'>
                                <p className='text-[11px] font-medium text-amber-700'>En proceso</p>
                                <p className='text-base font-semibold text-amber-800'>{totalEnProceso}</p>
                              </div>
                            </div>

                            <div className='grid gap-2 md:grid-cols-[1.2fr_.55fr_.55fr]'>
                              <Input
                                value={weeklyFindingsSearch}
                                onChange={(event) => {
                                  setWeeklyFindingsSearch(event.target.value);
                                  setWeeklyFindingsPage(1);
                                }}
                                placeholder='Buscar por equipo, modulo o descripcion del hallazgo...'
                                className='h-9'
                              />
                              <select
                                value={weeklyFindingsEstado}
                                onChange={(event) => {
                                  setWeeklyFindingsEstado(event.target.value as 'TODOS' | 'PENDIENTE' | 'SOLUCIONADO' | 'EN_PROCESO');
                                  setWeeklyFindingsPage(1);
                                }}
                                className='h-9 rounded-xl border border-wine-100 bg-white px-3 text-sm text-[#374151]'
                              >
                                <option value='TODOS'>Estado: Todos</option>
                                <option value='PENDIENTE'>Pendiente</option>
                                <option value='EN_PROCESO'>En proceso</option>
                                <option value='SOLUCIONADO'>Solucionado</option>
                              </select>
                              <select
                                value={weeklyFindingsSort}
                                onChange={(event) => {
                                  setWeeklyFindingsSort(event.target.value as WeeklySort);
                                  setWeeklyFindingsPage(1);
                                }}
                                className='h-9 rounded-xl border border-wine-100 bg-white px-3 text-sm text-[#374151]'
                              >
                                <option value='RECENT'>Orden: Mas recientes</option>
                                <option value='PENDIENTE_FIRST'>Orden: Pendientes primero</option>
                                <option value='EQUIPO'>Orden: Por equipo</option>
                              </select>
                            </div>

                            <p className='text-xs text-[#6B7280]'>
                              Mostrando {pagedHallazgos.length} de {filteredHallazgos.length} hallazgos filtrados ({hallazgosReportados.length} reportados en la semana).
                            </p>

                            {pagedHallazgos.length ? (
                              <div className='space-y-2'>
                                {pagedHallazgos.map((hallazgo) => (
                                  <div key={hallazgo.id} className='rounded-xl border border-black/5 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'>
                                    <div className='mb-2 flex flex-wrap items-center gap-2'>
                                      <span className='rounded-md bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-medium text-[#4B5563]'>
                                        {formatDate(hallazgo.fecha, 'dd/MM/yyyy')}
                                      </span>
                                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${weeklyEstadoStyle(hallazgo.estado)}`}>
                                        {normalizeWeeklyEstado(hallazgo.estado).replace('_', ' ')}
                                      </span>
                                    </div>

                                    <p className='text-xs font-semibold text-[#111827]'>
                                      {hallazgo.equipoCodigo} · {hallazgo.equipoNombre}
                                    </p>
                                    <p className='mt-1 text-xs font-medium text-[#374151]'>{hallazgo.modulo}</p>
                                    <p className='mt-1 text-xs leading-relaxed text-[#4B5563]'>{hallazgo.descripcion}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className='text-xs text-[#6B7280]'>No hay hallazgos con los filtros seleccionados.</p>
                            )}

                            {filteredHallazgos.length > FINDINGS_PAGE_SIZE ? (
                              <div className='flex items-center justify-between'>
                                <p className='text-xs text-[#6B7280]'>Pagina {currentPage} de {totalPages}</p>
                                <div className='flex gap-2'>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    disabled={currentPage <= 1}
                                    onClick={() => setWeeklyFindingsPage((page) => Math.max(1, page - 1))}
                                  >
                                    Anterior
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setWeeklyFindingsPage((page) => Math.min(totalPages, page + 1))}
                                  >
                                    Siguiente
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className='text-xs text-[#6B7280]'>No hay hallazgos reportados para este informe semanal.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title='Aun no hay informes semanales generados'
              description='Usa Generar para crear el primero o espera la ejecucion automatica del viernes.'
            />
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
