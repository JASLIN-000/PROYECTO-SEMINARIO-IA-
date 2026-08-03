import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarDays,
  CircleCheck,
  FileCheck,
  FilePlus2,
} from 'lucide-react';
import { CalendarCard } from '@/components/calendar-card';
import { EmptyState } from '@/components/empty-state';
import { EquipmentCard } from '@/components/equipment-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEquiposProgramados, useHallazgos, useInformes } from '@/hooks/use-dashboard';
import { getErrorMessage, normalizeText } from '@/lib/utils';
import type { Equipo, Hallazgo } from '@/types/domain';
import { toIsoDate } from '@/utils/business-days';

export function HomePage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [historyEquipo, setHistoryEquipo] = useState<Equipo | null>(null);

  const selectedIso = toIsoDate(selectedDate);
  const todayIso = toIsoDate(new Date());
  const query = useEquiposProgramados(selectedIso);
  const hallazgosQuery = useHallazgos({});
  const informesQuery = useInformes();

  const historialHallazgosEquipo = useMemo(() => {
    if (!historyEquipo) {
      return [] as Hallazgo[];
    }

    return (hallazgosQuery.data ?? []).filter(
      (item) =>
        normalizeText(item.idEquipo ?? '') === normalizeText(historyEquipo.idEquipo) ||
        normalizeText(item.nombreEquipo ?? '') === normalizeText(historyEquipo.nombreEquipo),
    );
  }, [hallazgosQuery.data, historyEquipo]);

  const hallazgosPendientes = (hallazgosQuery.data ?? []).filter(
    (item) => item.estado === 'ABIERTO' || item.estado === 'PENDIENTE',
  ).length;
  const hallazgosSolucionados = (hallazgosQuery.data ?? []).filter((item) => item.estado === 'SOLUCIONADO').length;
  const informesHoy = (informesQuery.data ?? []).filter((item) => item.fechaGeneracion.slice(0, 10) === todayIso).length;
  const equiposProgramados = query.data?.equipos.length ?? 0;

  const kpis = [
    {
      title: 'Hallazgos pendientes',
      value: hallazgosPendientes,
      icon: AlertTriangle,
      tone: 'bg-[#FDF2F2] text-[#8E0000]',
    },
    {
      title: 'Hallazgos solucionados',
      value: hallazgosSolucionados,
      icon: CircleCheck,
      tone: 'bg-[#F5F5F5] text-[#6B7280]',
    },
    {
      title: 'Informes generados hoy',
      value: informesHoy,
      icon: FileCheck,
      tone: 'bg-[#FDF2F2] text-[#8E0000]',
    },
    {
      title: 'Equipos programados',
      value: equiposProgramados,
      icon: CalendarDays,
      tone: 'bg-[#F5F5F5] text-[#6B7280]',
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <section className='space-y-5'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
          <div>
            <h1 className='font-display text-3xl font-bold tracking-tight text-[#111827]'>Inicio</h1>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='lg'
                onClick={() => {
                  const firstEquipo = query.data?.equipos?.find(
                    (item) => String(item.estado || '').trim().toUpperCase() === 'ACTIVO',
                  );
                  if (!firstEquipo) {
                    navigate('/informes?generar=1');
                    return;
                  }

                  navigate(
                    `/informes?equipoId=${firstEquipo.id}&equipoCodigo=${encodeURIComponent(firstEquipo.idEquipo)}&generar=1`,
                  );
                }}
              >
                <FilePlus2 className='mr-2 h-4 w-4' /> Generar informes
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir el flujo completo de informes</TooltipContent>
          </Tooltip>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
          <div className='w-full lg:col-span-4 lg:h-[520px] lg:max-w-[400px] xl:max-w-[420px]'>
            <CalendarCard
              date={selectedDate}
              onDateChange={(value) => value && setSelectedDate(value)}
              calendarContext={query.data?.calendario}
              hasEquiposForSelectedDate={(query.data?.equipos.length ?? 0) > 0}
            />
          </div>

          <Card className='flex flex-col rounded-2xl lg:col-span-8 lg:h-[520px]'>
            <CardHeader className='flex flex-row items-start justify-between gap-4 p-6'>
              <div>
                <CardTitle>Mantenimientos programados</CardTitle>
                <p className='mt-1 text-sm text-[#6B7280]'>Equipos correspondientes al Dia Habil seleccionado.</p>
              </div>
              <div className='rounded-2xl bg-[#F5F5F5] px-3 py-2 text-right'>
                <p className='text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]'>Equipos</p>
                <p className='text-sm font-semibold text-[#111827]'>{equiposProgramados}</p>
              </div>
            </CardHeader>
            <CardContent className='flex min-h-0 flex-1 flex-col p-6 pt-0'>
              {query.isLoading ? <LoadingSpinner label='Cargando equipos programados...' /> : null}
              {query.isError ? (
                <EmptyState
                  title='No fue posible cargar los equipos'
                  description={getErrorMessage(query.error, 'Intenta nuevamente en unos segundos.')}
                />
              ) : null}

              {!query.isLoading && !query.isError ? (
                query.data?.equipos?.length ? (
                  <ScrollArea className='min-h-0 flex-1 overflow-y-auto pr-3'>
                    <div className='grid gap-3'>
                      {query.data.equipos.map((equipo, index) => (
                        <motion.div
                          key={equipo.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                        >
                          <EquipmentCard
                            equipo={equipo}
                            onViewHistory={setHistoryEquipo}
                            onGenerateReport={(selectedEquipo) => {
                              navigate(
                                `/informes?equipoId=${selectedEquipo.id}&equipoCodigo=${encodeURIComponent(selectedEquipo.idEquipo)}&generar=1`,
                              );
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className='flex min-h-0 flex-1 items-center'>
                    <EmptyState
                      title='Sin equipos para la fecha seleccionada'
                      description={query.data?.mensaje ?? 'No existen equipos programados para este dia.'}
                    />
                  </div>
                )
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {kpis.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.05 }}
              >
                <Card className='rounded-2xl'>
                  <CardContent className='flex h-32 items-center justify-between p-6'>
                    <div>
                      <p className='text-sm font-semibold text-[#6B7280]'>{item.title}</p>
                      <p className='mt-3 text-3xl font-bold tracking-tight text-[#111827]'>{item.value}</p>
                    </div>
                    <div className={`grid h-14 w-14 place-items-center rounded-3xl ${item.tone}`}>
                      <Icon className='h-6 w-6' />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Sheet open={Boolean(historyEquipo)} onOpenChange={(open) => !open && setHistoryEquipo(null)}>
          <SheetContent className='w-full max-w-[540px] border-l border-black/5 bg-white p-0'>
            <div className='flex h-full flex-col'>
              <div className='border-b border-black/5 px-6 py-5'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]'>Historial de hallazgos</p>
                <h2 className='mt-2 font-display text-2xl font-bold text-[#111827]'>{historyEquipo?.idEquipo}</h2>
                <p className='mt-1 text-sm text-[#6B7280]'>{historyEquipo?.nombreEquipo}</p>
                <div className='mt-4'>
                  {String(historyEquipo?.estado || '').trim().toUpperCase() !== 'ACTIVO' ? (
                    <p className='text-xs font-semibold uppercase tracking-[0.12em] text-[#A11D2E]'>INACTIVO - solo historial</p>
                  ) : null}
                  <Button
                    size='sm'
                    disabled={String(historyEquipo?.estado || '').trim().toUpperCase() !== 'ACTIVO'}
                    onClick={() => {
                      if (!historyEquipo) {
                        return;
                      }

                      navigate(`/hallazgos?equipoId=${encodeURIComponent(historyEquipo.idEquipo)}`);
                      setHistoryEquipo(null);
                    }}
                  >
                    Agregar hallazgo
                  </Button>
                </div>
              </div>

              <ScrollArea className='flex-1 px-6 py-5'>
                <div className='space-y-4'>
                  {historialHallazgosEquipo.length ? (
                    historialHallazgosEquipo.map((item) => (
                      <Card key={item.id} className='rounded-[24px]'>
                        <CardContent className='space-y-3 p-5'>
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <p className='text-sm font-semibold text-[#111827]'>{item.modulo}</p>
                              <p className='text-xs text-[#6B7280]'>{item.fechaHallazgo.split('-').reverse().join('/')}</p>
                            </div>
                            <StatusBadge status={item.estado} />
                          </div>
                          <p className='text-sm text-[#6B7280]'>{item.descripcionHallazgo}</p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <EmptyState
                      title='Sin historial de hallazgos'
                      description='Este equipo no tiene hallazgos registrados en el historial actual.'
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

      </section>
    </TooltipProvider>
  );
}
