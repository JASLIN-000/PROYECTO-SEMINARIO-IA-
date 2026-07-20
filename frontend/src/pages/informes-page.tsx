import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createHallazgo, fetchHallazgos } from '@/services/hallazgos.service';
import { createInforme, fetchPlantillas, previewInforme } from '@/services/informes.service';
import { useInformes } from '@/hooks/use-dashboard';
import { formatDate, normalizeText } from '@/lib/utils';
import type { Informe } from '@/types/domain';

export function InformesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const prefilledEquipoId = searchParams.get('equipoId') ?? '';
  const prefilledEquipoCodigo = searchParams.get('equipoCodigo') ?? '';

  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [equipoId, setEquipoId] = useState(prefilledEquipoId);
  const [equipoCodigo, setEquipoCodigo] = useState(prefilledEquipoCodigo);
  const [mantenimientoId, setMantenimientoId] = useState('');
  const [modulos, setModulos] = useState('VERIFICACION DE SEGURIDAD Y CALIDAD');
  const [observaciones, setObservaciones] = useState('');
  const [pendientes, setPendientes] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [activePanel, setActivePanel] = useState<'hallazgos' | 'informes' | 'reportar'>('hallazgos');
  const [hallazgoModulo, setHallazgoModulo] = useState('');
  const [hallazgoDescripcion, setHallazgoDescripcion] = useState('');
  const [hallazgoObservacion, setHallazgoObservacion] = useState('');
  const [hallazgoCotizacion, setHallazgoCotizacion] = useState<'SI' | 'NO' | 'NA'>('NO');
  const [hallazgoEstado, setHallazgoEstado] = useState<'ABIERTO' | 'PENDIENTE' | 'SOLUCIONADO'>('ABIERTO');

  const query = useInformes();
  const hallazgosEquipoQuery = useQuery({
    queryKey: ['hallazgos-equipo-informe', equipoCodigo],
    queryFn: () => fetchHallazgos({ equipoId: equipoCodigo || undefined }),
    enabled: Boolean(equipoCodigo),
  });
  const plantillasQuery = useQuery({
    queryKey: ['plantillas'],
    queryFn: fetchPlantillas,
  });
  const previewQuery = useQuery({
    queryKey: ['informe-preview', equipoId, equipoCodigo, modulos, mantenimientoId],
    enabled: Boolean(modulos.trim()),
    queryFn: () => {
      const moduleList = modulos
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);

      return previewInforme({
        equipoId: equipoId ? Number(equipoId) : undefined,
        equipoCodigo: equipoCodigo || undefined,
        mantenimientoId: mantenimientoId ? Number(mantenimientoId) : undefined,
        modulos: moduleList,
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: createInforme,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['informes'] });
      setObservaciones('');
      setPendientes('');
      setRecomendaciones('');
    },
  });

  const reportHallazgoMutation = useMutation({
    mutationFn: createHallazgo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hallazgos-equipo-informe', equipoCodigo] });
      setHallazgoDescripcion('');
      setHallazgoObservacion('');
    },
  });

  const filtered = useMemo(() => {
    const term = normalizeText(search);
    const statusTerm = normalizeText(estado);

    return (query.data ?? []).filter((item) => {
      const bySearch = !term
        ? true
        : [item.nombreEquipo ?? '', item.idEquipo ?? '', item.tecnicoResponsable ?? ''].some((part) =>
            normalizeText(part).includes(term),
          );
      const byEstado = !statusTerm ? true : normalizeText(item.estado ?? '').includes(statusTerm);
      return bySearch && byEstado;
    });
  }, [estado, query.data, search]);

  const historialInformesEquipo = useMemo(() => {
    if (!equipoCodigo && !equipoId) {
      return [] as Informe[];
    }

    return (query.data ?? []).filter(
      (item) =>
        (equipoCodigo && (item.idEquipo === equipoCodigo || item.equipoCodigo === equipoCodigo)) ||
        (equipoId && item.equipoId === Number(equipoId)),
    );
  }, [equipoCodigo, equipoId, query.data]);

  const modulosDisponibles = useMemo(() => {
    const unique = new Set((plantillasQuery.data ?? []).map((item) => item.modulo).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [plantillasQuery.data]);

  const canSubmitHallazgo = Boolean(equipoCodigo && hallazgoModulo && hallazgoDescripcion.trim());

  const columns = useMemo<ColumnDef<Informe>[]>(
    () => [
      {
        accessorKey: 'nombreEquipo',
        header: 'Equipo',
      },
      {
        accessorKey: 'fechaGeneracion',
        header: 'Fecha',
        cell: ({ row }) => formatDate(row.original.fechaGeneracion, 'dd/MM/yyyy HH:mm'),
      },
      {
        accessorKey: 'modulos',
        header: 'Tipo mantenimiento',
        cell: ({ row }) => row.original.modulos?.join(', ') ?? '-',
      },
      {
        accessorKey: 'tecnicoResponsable',
        header: 'Tecnico',
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => <StatusBadge status={row.original.estado} />,
      },
      {
        id: 'actions',
        header: '',
        cell: () => (
          <Button variant='outline' size='sm'>
            <Eye className='mr-2 h-4 w-4' /> Ver informe
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <section className='space-y-6'>
      <PageHeader title='Informes' description='Ultimos informes de mantenimiento con filtros y navegacion.' />

      <div className='space-y-3 rounded-2xl border border-wine-100 bg-white p-4'>
        <h3 className='font-display text-lg font-semibold text-wine-900'>Generar informe</h3>
        <div className='grid gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
          <div className='space-y-3'>
            <div className='grid gap-3 md:grid-cols-2'>
              <Input value={equipoId} onChange={(event) => setEquipoId(event.target.value)} placeholder='Equipo ID (interno)' />
              <Input value={equipoCodigo} onChange={(event) => setEquipoCodigo(event.target.value)} placeholder='Equipo codigo (ej: 4333S-01)' />
              <Input value={mantenimientoId} onChange={(event) => setMantenimientoId(event.target.value)} placeholder='Mantenimiento ID (opcional)' />
              <Input
                value={modulos}
                onChange={(event) => setModulos(event.target.value)}
                placeholder='Modulos separados por coma (1 a 3)'
              />
            </div>

            {plantillasQuery.data?.length ? (
              <div className='rounded-xl border border-wine-100 p-3'>
                <p className='mb-2 text-sm font-medium text-wine-900'>Plantillas automaticas disponibles</p>
                <div className='flex flex-wrap gap-2'>
                  {plantillasQuery.data.slice(0, 12).map((plantilla) => (
                    <Button
                      key={plantilla.id}
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        const current = modulos
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean);
                        if (current.includes(plantilla.modulo) || current.length >= 3) {
                          return;
                        }
                        setModulos([...current, plantilla.modulo].join(', '));
                      }}
                    >
                      {plantilla.modulo}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <Input value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder='Observaciones' />
            <Input value={pendientes} onChange={(event) => setPendientes(event.target.value)} placeholder='Pendientes' />
            <Input value={recomendaciones} onChange={(event) => setRecomendaciones(event.target.value)} placeholder='Recomendaciones' />
            <div className='flex flex-wrap gap-2'>
              <Button
                onClick={() => {
                  const moduleList = modulos
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 3);

                  createMutation.mutate({
                    equipoId: equipoId ? Number(equipoId) : undefined,
                    equipoCodigo: equipoCodigo || undefined,
                    mantenimientoId: mantenimientoId ? Number(mantenimientoId) : undefined,
                    modulos: moduleList,
                    observaciones: observaciones || undefined,
                    pendientes: pendientes || undefined,
                    recomendaciones: recomendaciones || undefined,
                  });
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Generando...' : 'Generar informe'}
              </Button>
              {createMutation.isError ? (
                <span className='text-sm text-red-600'>{(createMutation.error as Error).message}</span>
              ) : null}
              {createMutation.isSuccess ? <span className='text-sm text-emerald-600'>Informe generado correctamente.</span> : null}
            </div>
          </div>

          <div className='rounded-xl border border-wine-100 bg-wine-50/30 p-3'>
            <p className='mb-2 text-sm font-medium text-wine-900'>Plantilla automatica para el equipo seleccionado</p>
            {previewQuery.isLoading ? <LoadingSpinner label='Generando plantilla automatica...' /> : null}
            {previewQuery.data ? (
              <>
                <p className='mb-2 text-xs text-slate-600'>
                  Hallazgos relacionados: {previewQuery.data.resumenHallazgos.total} (A {previewQuery.data.resumenHallazgos.abiertos} /
                  P {previewQuery.data.resumenHallazgos.pendientes} / S {previewQuery.data.resumenHallazgos.solucionados})
                </p>
                <div className='max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-wine-100 bg-white p-3 text-xs text-slate-700'>
                  {previewQuery.data.textoGenerado}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className='space-y-3 rounded-xl border border-wine-100 p-3'>
          <div className='flex flex-wrap gap-2'>
            <Button variant={activePanel === 'hallazgos' ? 'default' : 'outline'} size='sm' onClick={() => setActivePanel('hallazgos')}>
              Historial de hallazgos
            </Button>
            <Button variant={activePanel === 'informes' ? 'default' : 'outline'} size='sm' onClick={() => setActivePanel('informes')}>
              Historial de informes
            </Button>
            <Button variant={activePanel === 'reportar' ? 'default' : 'outline'} size='sm' onClick={() => setActivePanel('reportar')}>
              Reportar hallazgo
            </Button>
          </div>

          {activePanel === 'hallazgos' ? (
            <div className='space-y-2'>
              {hallazgosEquipoQuery.isLoading ? <LoadingSpinner label='Cargando historial de hallazgos...' /> : null}
              {(hallazgosEquipoQuery.data ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className='rounded-lg border border-wine-100 bg-white p-3 text-sm'>
                  <div className='mb-1 flex items-center justify-between'>
                    <strong>{item.modulo}</strong>
                    <StatusBadge status={item.estado} />
                  </div>
                  <p className='text-slate-600'>{item.descripcionHallazgo}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activePanel === 'informes' ? (
            <div className='space-y-2'>
              {historialInformesEquipo.slice(0, 8).map((item) => (
                <div key={item.id} className='rounded-lg border border-wine-100 bg-white p-3 text-sm'>
                  <div className='mb-1 flex items-center justify-between'>
                    <strong>#{item.id} · {item.idEquipo ?? item.equipoCodigo ?? '-'}</strong>
                    <span className='text-xs text-slate-500'>{formatDate(item.fechaGeneracion, 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  <p className='text-slate-600'>{item.modulos.join(', ')}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activePanel === 'reportar' ? (
            <div className='space-y-3'>
              <select
                value={hallazgoModulo}
                onChange={(event) => setHallazgoModulo(event.target.value)}
                className='h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
              >
                <option value=''>Selecciona un modulo</option>
                {modulosDisponibles.map((modulo) => (
                  <option key={modulo} value={modulo}>
                    {modulo}
                  </option>
                ))}
              </select>
              <Input value={hallazgoDescripcion} onChange={(event) => setHallazgoDescripcion(event.target.value)} placeholder='Descripcion del hallazgo' />
              <Input value={hallazgoObservacion} onChange={(event) => setHallazgoObservacion(event.target.value)} placeholder='Observacion (opcional)' />
              <select
                value={hallazgoCotizacion}
                onChange={(event) => setHallazgoCotizacion(event.target.value as 'SI' | 'NO' | 'NA')}
                className='h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
              >
                <option value='SI'>Cotizacion: SI</option>
                <option value='NO'>Cotizacion: NO</option>
                <option value='NA'>Cotizacion: NA</option>
              </select>
              <select
                value={hallazgoEstado}
                onChange={(event) => setHallazgoEstado(event.target.value as 'ABIERTO' | 'PENDIENTE' | 'SOLUCIONADO')}
                className='h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
              >
                <option value='ABIERTO'>Estado: ABIERTO</option>
                <option value='PENDIENTE'>Estado: PENDIENTE</option>
                <option value='SOLUCIONADO'>Estado: SOLUCIONADO</option>
              </select>
              <Button
                onClick={() => {
                  if (!canSubmitHallazgo) {
                    return;
                  }

                  reportHallazgoMutation.mutate({
                    equipoId: equipoCodigo,
                    tipoMantenimiento: 'PREVENTIVO',
                    modulo: hallazgoModulo,
                    descripcionHallazgo: hallazgoDescripcion,
                    cotizacion: hallazgoCotizacion,
                    observacion: hallazgoObservacion || undefined,
                    estado: hallazgoEstado,
                    fechaHallazgo: new Date().toISOString().slice(0, 10),
                  });
                }}
                disabled={reportHallazgoMutation.isPending || !canSubmitHallazgo}
              >
                {reportHallazgoMutation.isPending ? 'Reportando...' : 'Reportar hallazgo'}
              </Button>
              {!canSubmitHallazgo ? (
                <span className='text-xs text-slate-500'>Completa equipo codigo, modulo y descripcion para reportar.</span>
              ) : null}
              {reportHallazgoMutation.isError ? (
                <span className='text-sm text-red-600'>{(reportHallazgoMutation.error as Error).message}</span>
              ) : null}
              {reportHallazgoMutation.isSuccess ? <span className='text-sm text-emerald-600'>Hallazgo reportado correctamente.</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className='grid gap-3 rounded-2xl border border-wine-100 bg-white p-4 md:grid-cols-2'>
        <SearchBar value={search} onChange={setSearch} placeholder='Buscar por equipo o tecnico...' />
        <SearchBar value={estado} onChange={setEstado} placeholder='Filtrar por estado...' />
      </div>

      {query.isLoading ? <LoadingSpinner label='Cargando informes...' /> : null}
      {query.isError ? <EmptyState title='Error al cargar informes' description='No fue posible obtener los informes.' /> : null}
      {!query.isLoading && !query.isError ? <DataTable columns={columns} data={filtered} searchPlaceholder='Buscar en la tabla...' /> : null}
    </section>
  );
}
