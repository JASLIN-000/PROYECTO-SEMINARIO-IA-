import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  Settings2,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useHallazgos } from '@/hooks/use-dashboard';
import { formatDate, normalizeText } from '@/lib/utils';
import { fetchEquiposProgramados } from '@/services/equipos.service';
import { createHallazgo, updateHallazgoEstado, type UpdateHallazgoEstado } from '@/services/hallazgos.service';
import { fetchPlantillas } from '@/services/informes.service';
import type { Hallazgo } from '@/types/domain';
import { toIsoDate } from '@/utils/business-days';

const TIPO_MANTENIMIENTO_OPTIONS = ['PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO', 'INSPECCION'] as const;
const ESTADO_CAMBIO_OPTIONS = ['ABIERTO', 'PENDIENTE', 'SOLUCIONADO'] as const;
const HALLAZGO_ESTADO_OPTIONS = ['ABIERTO', 'PENDIENTE', 'SOLUCIONADO'] as const;
const PRIORIDAD_OPTIONS = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
const DESCRIPTION_LIMIT = 1000;
const NOTE_LIMIT = 300;
const ACTION_LIMIT = 300;

function truncateValue(value: string, limit: number): string {
  return value.slice(0, limit);
}

function countText(value: string): number {
  return value.length;
}

function normalizeTipoLabel(value: string | null | undefined): string {
  return String(value || 'PREVENTIVO').trim().toUpperCase() || 'PREVENTIVO';
}

function normalizeEstadoEditable(estado: string | null | undefined): string {
  const normalized = String(estado ?? '').trim().toUpperCase();
  if (normalized === 'CERRADO') {
    return 'SOLUCIONADO';
  }
  return normalized;
}

function estadoSelectTone(estado: string): string {
  if (estado === 'SOLUCIONADO') {
    return 'border-[#B7E4C7] bg-[#EAF8EF] text-[#166534]';
  }
  if (estado === 'PENDIENTE') {
    return 'border-[#F6DFA0] bg-[#FEF3C7] text-[#92400E]';
  }
  return 'border-[#F6C5CB] bg-[#FDECEC] text-[#A11D2E]';
}

export function HallazgosPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [estado, setEstado] = useState('');
  const [equipo, setEquipo] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [selected, setSelected] = useState<Hallazgo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [updatingEstadoId, setUpdatingEstadoId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({
    equipoId: '',
    nombreEquipo: '',
    mantenimientoId: '',
    tipoMantenimiento: 'PREVENTIVO',
    modulo: '',
    descripcionHallazgo: '',
    cotizacion: 'NO' as 'SI' | 'NO' | 'NA',
    observacionesAdicionales: '',
    accionInmediata: '',
    prioridad: 'MEDIA' as 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA',
    estado: 'PENDIENTE' as 'ABIERTO' | 'PENDIENTE' | 'SOLUCIONADO',
    fechaHallazgo: toIsoDate(new Date()),
    fechaSolucion: '',
  });

  const plantillasQuery = useQuery({
    queryKey: ['plantillas'],
    queryFn: fetchPlantillas,
    retry: 2,
  });

  const equiposCatalogQuery = useQuery({
    queryKey: ['equipos-catalogo-autofill', createForm.equipoId.trim()],
    queryFn: () => fetchEquiposProgramados(undefined, createForm.equipoId.trim(), true),
    enabled: createOpen && Boolean(createForm.equipoId.trim()),
    retry: 2,
  });

  const moduloOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of plantillasQuery.data ?? []) {
      const modulo = String(item.modulo || '').trim();
      if (!modulo) {
        continue;
      }
      const key = normalizeText(modulo);
      if (!unique.has(key)) {
        unique.set(key, modulo);
      }
    }
    return Array.from(unique.values()).sort((left, right) => left.localeCompare(right));
  }, [plantillasQuery.data]);

  const createMutation = useMutation({
    mutationFn: () =>
      createHallazgo({
        equipoId: createForm.equipoId.trim(),
        mantenimientoId: createForm.mantenimientoId.trim() ? Number(createForm.mantenimientoId) : undefined,
        tipoMantenimiento: createForm.tipoMantenimiento.trim(),
        modulo: createForm.modulo.trim(),
        descripcionHallazgo: createForm.descripcionHallazgo.trim(),
        cotizacion: createForm.cotizacion,
        observacion:
          [
            createForm.observacionesAdicionales.trim() ? `Observaciones adicionales: ${createForm.observacionesAdicionales.trim()}` : '',
            createForm.accionInmediata.trim() ? `Acción inmediata realizada: ${createForm.accionInmediata.trim()}` : '',
            createForm.prioridad.trim() ? `Prioridad: ${createForm.prioridad.trim()}` : '',
          ]
            .filter(Boolean)
            .join(' | ') || undefined,
        estado: createForm.estado,
        fechaHallazgo: createForm.fechaHallazgo,
        ...(createForm.estado === 'SOLUCIONADO' && createForm.fechaSolucion
          ? { fechaSolucion: createForm.fechaSolucion }
          : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
      setCreateOpen(false);
      setCreateForm((current) => ({
        ...current,
        mantenimientoId: '',
        modulo: '',
        descripcionHallazgo: '',
        observacionesAdicionales: '',
        accionInmediata: '',
        prioridad: 'MEDIA',
        estado: 'PENDIENTE',
        fechaHallazgo: toIsoDate(new Date()),
        fechaSolucion: '',
      }));
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: UpdateHallazgoEstado }) => updateHallazgoEstado(id, estado),
    onMutate: ({ id }) => {
      setUpdatingEstadoId(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
    },
    onSettled: () => {
      setUpdatingEstadoId(null);
    },
  });

  useEffect(() => {
    const equipoIdParam = searchParams.get('equipoId');
    if (!equipoIdParam) {
      return;
    }

    setCreateForm((current) => ({ ...current, equipoId: equipoIdParam }));
    setCreateOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('equipoId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const query = useHallazgos({
    estado: estado || undefined,
    equipoId: equipo || undefined,
    nombreEquipo: nombreEquipo || undefined,
  });

  const selectedEquipoFromCatalog = useMemo(() => {
    const equipoRef = createForm.equipoId.trim();
    if (!equipoRef) {
      return null;
    }

    return (equiposCatalogQuery.data?.equipos ?? []).find((item) => {
      return normalizeText(item.idEquipo ?? '') === normalizeText(equipoRef);
    }) ?? null;
  }, [createForm.equipoId, equiposCatalogQuery.data?.equipos]);

  const equipoSuggestions = useMemo(() => {
    const term = createForm.equipoId.trim();
    if (!term) {
      return [];
    }

    const normalizedTerm = normalizeText(term);
    const items = equiposCatalogQuery.data?.equipos ?? [];

    const startsWith: typeof items = [];
    const contains: typeof items = [];

    for (const item of items) {
      const code = normalizeText(item.idEquipo ?? '');
      const name = normalizeText(item.nombreEquipo ?? '');
      const matches = code.includes(normalizedTerm) || name.includes(normalizedTerm);
      if (!matches) {
        continue;
      }

      if (code.startsWith(normalizedTerm)) {
        startsWith.push(item);
      } else {
        contains.push(item);
      }
    }

    return [...startsWith, ...contains].slice(0, 8);
  }, [createForm.equipoId, equiposCatalogQuery.data?.equipos]);

  useEffect(() => {
    if (!createOpen) {
      return;
    }

    if (!createForm.equipoId.trim() && equipo.trim()) {
      setCreateForm((current) => ({ ...current, equipoId: equipo.trim() }));
    }
  }, [createForm.equipoId, createOpen, equipo]);

  useEffect(() => {
    if (!createForm.equipoId.trim()) {
      setCreateForm((current) => ({
        ...current,
        nombreEquipo: '',
      }));
      return;
    }

    if (!selectedEquipoFromCatalog?.nombreEquipo) {
      return;
    }

    setCreateForm((current) => {
      if (current.nombreEquipo === selectedEquipoFromCatalog.nombreEquipo) {
        return current;
      }
      return {
        ...current,
        nombreEquipo: selectedEquipoFromCatalog.nombreEquipo ?? '',
        tipoMantenimiento: normalizeTipoLabel(selectedEquipoFromCatalog.tipoMantenimiento),
      };
    });
  }, [createForm.equipoId, selectedEquipoFromCatalog]);

  const columns = useMemo<ColumnDef<Hallazgo>[]>(
    () => [
      {
        accessorKey: 'fechaHallazgo',
        header: ({ column }) => (
          <Button variant='ghost' size='sm' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Fecha <ArrowUpDown className='ml-1 h-3.5 w-3.5' />
          </Button>
        ),
        cell: ({ row }) => formatDate(row.original.fechaHallazgo, 'dd/MM/yyyy'),
      },
      {
        accessorKey: 'nombreEquipo',
        header: 'Equipo',
      },
      {
        accessorKey: 'modulo',
        header: 'Modulo',
      },
      {
        accessorKey: 'descripcionHallazgo',
        header: 'Descripcion',
        cell: ({ row }) => <span className='line-clamp-2'>{row.original.descripcionHallazgo}</span>,
      },
      {
        accessorKey: 'tipoMantenimiento',
        header: 'Tipo mantenimiento',
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => {
          const current = normalizeEstadoEditable(row.original.estado);
          const isAllowed = ESTADO_CAMBIO_OPTIONS.includes(current as UpdateHallazgoEstado);
          const selectValue = isAllowed ? current : 'ABIERTO';

          return (
            <select
              value={selectValue}
              onChange={(event) => {
                const next = event.target.value as UpdateHallazgoEstado;
                if (!next || next === current) {
                  return;
                }
                updateEstadoMutation.mutate({ id: row.original.id, estado: next });
              }}
              disabled={updateEstadoMutation.isPending && updatingEstadoId === row.original.id}
              className={`h-9 min-w-[168px] rounded-full border px-3 text-xs font-semibold tracking-wide ${estadoSelectTone(selectValue)}`}
            >
              <option value='ABIERTO'>ABIERTO</option>
              <option value='PENDIENTE'>PENDIENTE</option>
              <option value='SOLUCIONADO'>SOLUCIONADO</option>
            </select>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant='outline' size='sm' onClick={() => setSelected(row.original)}>
            <Eye className='mr-2 h-4 w-4' /> Ver
          </Button>
        ),
      },
    ],
    [updateEstadoMutation, updatingEstadoId],
  );

  return (
    <section className='space-y-6'>
      <PageHeader
        title='Hallazgos'
        description='Consulta y revisa los ultimos hallazgos registrados.'
        actions={(
          <Button onClick={() => setCreateOpen(true)}>Agregar hallazgo</Button>
        )}
      />

      <div className='grid gap-3 rounded-2xl border border-wine-100 bg-white p-4 md:grid-cols-3'>
        <SearchBar value={nombreEquipo} onChange={setNombreEquipo} placeholder='Buscar por nombre de equipo...' />
        <Input value={equipo} onChange={(event) => setEquipo(event.target.value)} placeholder='Filtrar por codigo equipo' />
        <Input value={estado} onChange={(event) => setEstado(event.target.value)} placeholder='Filtrar por estado' />
      </div>

      {query.isLoading ? <LoadingSpinner label='Cargando hallazgos...' /> : null}
      {query.isError ? <EmptyState title='Error al cargar hallazgos' description='Intenta nuevamente.' /> : null}
      {!query.isLoading && !query.isError ? <DataTable columns={columns} data={query.data ?? []} searchPlaceholder='Buscar en resultados...' /> : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected ? (
            <>
              <div className='space-y-1'>
                <h3 className='text-lg font-semibold text-wine-900'>Hallazgo #{selected.id}</h3>
                <p className='text-sm text-slate-500'>{selected.nombreEquipo ?? selected.idEquipo ?? 'Equipo sin nombre'}</p>
              </div>

              <div className='grid gap-2 text-sm text-slate-600'>
                <p>
                  <strong>Modulo:</strong> {selected.modulo}
                </p>
                <p>
                  <strong>Descripcion:</strong> {selected.descripcionHallazgo}
                </p>
                <p>
                  <strong>Tipo de mantenimiento:</strong> {selected.tipoMantenimiento}
                </p>
                <p>
                  <strong>Estado:</strong> {selected.estado}
                </p>
                <p>
                  <strong>Fecha hallazgo:</strong> {formatDate(selected.fechaHallazgo)}
                </p>
                <p>
                  <strong>Fecha solucion:</strong> {selected.fechaSolucion ? formatDate(selected.fechaSolucion) : 'Sin fecha'}
                </p>
                <p>
                  <strong>Observacion:</strong> {selected.observacion ?? 'Sin observaciones'}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='h-[88vh] w-[90vw] max-w-[1400px] overflow-hidden rounded-[20px] border border-black/10 bg-white p-0 shadow-[0_24px_60px_rgba(17,24,39,0.14)] [&>button]:hidden'>
          <div className='flex h-full min-h-0 flex-col'>
            <header className='border-b border-black/5 px-6 py-5 sm:px-8'>
              <div className='flex items-start justify-between gap-4'>
                <div className='space-y-2'>
                  <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCECEF] text-[#A11D2E]'>
                    <Wrench className='h-5 w-5' />
                  </div>
                  <div>
                    <h2 className='text-xl font-semibold tracking-tight text-[#111827] sm:text-2xl'>Agregar nuevo hallazgo</h2>
                    <p className='mt-1 text-sm text-[#6B7280]'>Registra un nuevo hallazgo encontrado durante la intervención del equipo.</p>
                  </div>
                </div>

                <DialogClose asChild>
                  <button
                    type='button'
                    className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#111827]'
                    aria-label='Cerrar modal'
                  >
                    <X className='h-5 w-5' />
                  </button>
                </DialogClose>
              </div>

              <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                {[
                  { step: 1, label: 'Información general', active: true },
                  { step: 2, label: 'Descripción del hallazgo', active: false },
                  { step: 3, label: 'Confirmación', active: false },
                ].map((item) => (
                  <div key={item.step} className='flex items-center gap-3 rounded-xl border border-black/5 bg-[#FAFAFB] px-3 py-2.5'>
                    <span
                      className={[
                        'inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                        item.active
                          ? 'border-[#A11D2E] bg-[#A11D2E] text-white'
                          : 'border-black/10 bg-white text-[#6B7280]',
                      ].join(' ')}
                    >
                      {item.step}
                    </span>
                    <div className='min-w-0'>
                      <p className={item.active ? 'text-sm font-semibold text-[#111827]' : 'text-sm text-[#6B7280]'}>{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </header>

            <div className='min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8'>
              <div className='grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-[70%_30%]'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-black/5 bg-white p-5 shadow-[0_6px_20px_rgba(17,24,39,0.05)] sm:p-6'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-[#111827]'>Información general</h3>
                      <p className='mt-1 text-sm text-[#6B7280]'>Completa la información básica del hallazgo.</p>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>ID del equipo</label>
                        <Input
                          value={createForm.equipoId}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              equipoId: event.target.value,
                            }))
                          }
                          className='h-11 rounded-xl'
                          placeholder='Ingresa el ID del equipo'
                        />
                        {createForm.equipoId.trim() && equipoSuggestions.length ? (
                          <div className='max-h-44 overflow-y-auto rounded-xl border border-black/10 bg-white p-1'>
                            {equipoSuggestions.map((item) => (
                              <button
                                key={item.id}
                                type='button'
                                onClick={() =>
                                  setCreateForm((current) => ({
                                    ...current,
                                    equipoId: item.idEquipo,
                                    nombreEquipo: item.nombreEquipo,
                                    tipoMantenimiento: normalizeTipoLabel(item.tipoMantenimiento),
                                  }))
                                }
                                className='flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#F9FAFB]'
                              >
                                <span className='text-xs font-semibold text-[#111827]'>{item.idEquipo}</span>
                                <span className='line-clamp-1 text-xs text-[#6B7280]'>{item.nombreEquipo}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Nombre del equipo</label>
                        <Input value={createForm.nombreEquipo} readOnly className='h-11 rounded-xl bg-[#F9FAFB]' />
                        {createForm.equipoId.trim() && equiposCatalogQuery.isFetching ? (
                          <p className='text-xs text-[#6B7280]'>Buscando equipo...</p>
                        ) : null}
                        {createForm.equipoId.trim() && !equiposCatalogQuery.isFetching && !selectedEquipoFromCatalog ? (
                          <p className='text-xs text-[#A11D2E]'>No se encontró el equipo para ese ID.</p>
                        ) : null}
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Fecha del hallazgo</label>
                        <Input
                          type='date'
                          value={createForm.fechaHallazgo}
                          onChange={(event) => setCreateForm((current) => ({ ...current, fechaHallazgo: event.target.value }))}
                          className='h-11 rounded-xl'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Tipo de mantenimiento</label>
                        <select
                          value={createForm.tipoMantenimiento}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              tipoMantenimiento: event.target.value,
                            }))
                          }
                          className='h-11 w-full rounded-xl border border-wine-100 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                        >
                          {TIPO_MANTENIMIENTO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Módulo</label>
                        <select
                          value={createForm.modulo}
                          onChange={(event) => setCreateForm((current) => ({ ...current, modulo: event.target.value }))}
                          className='h-11 w-full rounded-xl border border-wine-100 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                        >
                          <option value=''>Selecciona módulo</option>
                          {moduloOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Estado</label>
                        <select
                          value={createForm.estado}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              estado: event.target.value as 'ABIERTO' | 'PENDIENTE' | 'SOLUCIONADO',
                            }))
                          }
                          className='h-11 w-full rounded-xl border border-wine-100 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                        >
                          {HALLAZGO_ESTADO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Prioridad</label>
                        <select
                          value={createForm.prioridad}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              prioridad: event.target.value as 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA',
                            }))
                          }
                          className='h-11 w-full rounded-xl border border-wine-100 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                        >
                          {PRIORIDAD_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Mantenimiento ID (opcional)</label>
                        <Input
                          value={createForm.mantenimientoId}
                          onChange={(event) => setCreateForm((current) => ({ ...current, mantenimientoId: event.target.value }))}
                          placeholder='Ej: 245'
                          className='h-11 rounded-xl'
                        />
                      </div>

                      <div className='space-y-1.5 xl:col-span-2'>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>¿Requiere cotización?</label>
                        <select
                          value={createForm.cotizacion}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              cotizacion: event.target.value as 'SI' | 'NO' | 'NA',
                            }))
                          }
                          className='h-11 w-full rounded-xl border border-wine-100 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                        >
                          <option value='SI'>SI</option>
                          <option value='NO'>NO</option>
                          <option value='NA'>NO APLICA</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section className='rounded-2xl border border-black/5 bg-white p-5 shadow-[0_6px_20px_rgba(17,24,39,0.05)] sm:p-6'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-[#111827]'>Descripción del hallazgo</h3>
                    </div>

                    <div className='space-y-5'>
                      <div>
                        <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Descripción del hallazgo</label>
                        <textarea
                          value={createForm.descripcionHallazgo}
                          onChange={(event) =>
                            setCreateForm((current) => ({
                              ...current,
                              descripcionHallazgo: truncateValue(event.target.value, DESCRIPTION_LIMIT),
                            }))
                          }
                          rows={8}
                          className='mt-1.5 w-full rounded-xl border border-wine-100 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                          placeholder='Describe claramente el problema identificado...'
                        />
                        <p className='mt-1 text-right text-xs text-[#6B7280]'>
                          {countText(createForm.descripcionHallazgo)} / {DESCRIPTION_LIMIT} caracteres
                        </p>
                      </div>

                      <div className='grid gap-4 lg:grid-cols-2'>
                        <div>
                          <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Observaciones adicionales</label>
                          <textarea
                            value={createForm.observacionesAdicionales}
                            onChange={(event) =>
                              setCreateForm((current) => ({
                                ...current,
                                observacionesAdicionales: truncateValue(event.target.value, NOTE_LIMIT),
                              }))
                            }
                            rows={5}
                            className='mt-1.5 w-full rounded-xl border border-wine-100 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                            placeholder='Información técnica complementaria...'
                          />
                          <p className='mt-1 text-right text-xs text-[#6B7280]'>
                            {countText(createForm.observacionesAdicionales)} / {NOTE_LIMIT} caracteres
                          </p>
                        </div>

                        <div>
                          <label className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>Acción inmediata realizada</label>
                          <textarea
                            value={createForm.accionInmediata}
                            onChange={(event) =>
                              setCreateForm((current) => ({
                                ...current,
                                accionInmediata: truncateValue(event.target.value, ACTION_LIMIT),
                              }))
                            }
                            rows={5}
                            className='mt-1.5 w-full rounded-xl border border-wine-100 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#A11D2E]/20'
                            placeholder='Describe la acción ejecutada en campo...'
                          />
                          <p className='mt-1 text-right text-xs text-[#6B7280]'>
                            {countText(createForm.accionInmediata)} / {ACTION_LIMIT} caracteres
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className='space-y-4'>
                  <section className='rounded-2xl border border-black/5 bg-white p-4 shadow-[0_6px_20px_rgba(17,24,39,0.05)]'>
                    <h4 className='mb-3 text-sm font-semibold text-[#111827]'>Información del equipo</h4>
                    <div className='space-y-2 text-sm'>
                      <InfoLine icon={Settings2} label='Nombre' value={createForm.nombreEquipo || 'No disponible'} />
                      <InfoLine icon={ShieldCheck} label='ID' value={createForm.equipoId || 'No disponible'} />
                      <div className='flex items-center justify-between rounded-lg border border-black/5 bg-[#F9FAFB] px-3 py-2'>
                        <span className='text-xs font-medium text-[#6B7280]'>Estado</span>
                        <span className='rounded-full bg-[#EAF8EF] px-2.5 py-1 text-xs font-semibold text-[#166534]'>ACTIVO</span>
                      </div>
                      <InfoLine icon={MapPin} label='Ruta' value='No disponible' />
                      <InfoLine icon={CalendarDays} label='Día hábil (DH)' value={createForm.fechaHallazgo || '-'} />
                      <InfoLine icon={Wrench} label='Tipo' value={createForm.tipoMantenimiento || 'PREVENTIVO'} />
                      <InfoLine icon={Clock3} label='Horario programado' value='No disponible' />
                    </div>
                  </section>

                  <section className='rounded-2xl border border-[#F1E4B7] bg-[#FFFBEF] p-4'>
                    <h4 className='mb-2 text-sm font-semibold text-[#111827]'>¿Qué es un hallazgo?</h4>
                    <p className='text-sm leading-6 text-[#4B5563]'>
                      Un hallazgo es cualquier condición, anomalía o componente identificado durante el mantenimiento que requiere seguimiento, reparación o control.
                    </p>
                  </section>

                  <section className='rounded-2xl border border-[#F4DDE1] bg-[#FDF4F6] p-4'>
                    <h4 className='mb-2 text-sm font-semibold text-[#111827]'>Buenas prácticas</h4>
                    <ul className='space-y-2 text-sm text-[#4B5563]'>
                      <li className='flex items-start gap-2'><CheckCircle2 className='mt-0.5 h-4 w-4 text-[#A11D2E]' /> Describir claramente el problema.</li>
                      <li className='flex items-start gap-2'><CheckCircle2 className='mt-0.5 h-4 w-4 text-[#A11D2E]' /> Especificar el módulo donde fue encontrado.</li>
                      <li className='flex items-start gap-2'><CheckCircle2 className='mt-0.5 h-4 w-4 text-[#A11D2E]' /> Registrar únicamente información verificable.</li>
                      <li className='flex items-start gap-2'><CheckCircle2 className='mt-0.5 h-4 w-4 text-[#A11D2E]' /> Utilizar lenguaje técnico.</li>
                      <li className='flex items-start gap-2'><CheckCircle2 className='mt-0.5 h-4 w-4 text-[#A11D2E]' /> Definir correctamente el estado del hallazgo.</li>
                    </ul>
                  </section>
                </aside>
              </div>
            </div>
            <footer className='border-t border-black/5 px-6 py-4 sm:px-8'>
              <div className='flex flex-wrap items-center justify-end gap-3'>
                {createMutation.isError ? (
                  <p className='mr-auto inline-flex items-center gap-2 text-sm text-[#B42318]'>
                    <AlertCircle className='h-4 w-4' /> {(createMutation.error as Error).message}
                  </p>
                ) : null}

                <DialogClose asChild>
                  <Button variant='outline' className='h-11 rounded-xl border-[#A11D2E] px-6 text-[#A11D2E] hover:bg-[#FDF4F6]'>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={
                    createMutation.isPending ||
                    !createForm.equipoId.trim() ||
                    !createForm.tipoMantenimiento.trim() ||
                    !createForm.modulo.trim() ||
                    !createForm.descripcionHallazgo.trim() ||
                    !createForm.fechaHallazgo
                  }
                  className='h-11 rounded-xl bg-[#A11D2E] px-6 text-white transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#8A1627]'
                >
                  {createMutation.isPending ? 'Guardando...' : 'Guardar hallazgo'}
                </Button>
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type InfoLineProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
};

function InfoLine({ icon: Icon, label, value }: InfoLineProps) {
  return (
    <div className='flex items-center justify-between gap-2 rounded-lg border border-black/5 bg-[#F9FAFB] px-3 py-2'>
      <div className='flex items-center gap-2'>
        <Icon className='h-3.5 w-3.5 text-[#A11D2E]' />
        <span className='text-xs font-medium text-[#6B7280]'>{label}</span>
      </div>
      <span className='truncate text-xs font-semibold text-[#111827]'>{value}</span>
    </div>
  );
}
