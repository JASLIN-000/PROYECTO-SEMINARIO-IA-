import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bold,
  Building2,
  CalendarDays,
  Check,
  CircleDot,
  Clock3,
  FileText,
  Italic,
  List,
  ListOrdered,
  Loader2,
  MapPin,
  Maximize2,
  PenLine,
  Plus,
  Redo2,
  Search,
  Settings2,
  Underline,
  Undo2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SolicitudesAsociadasCard } from '@/components/solicitudes-asociadas-card';
import { useAuth } from '@/hooks/auth-context';
import { createInforme, previewInforme } from '@/services/informes.service';
import { cn, formatDate, normalizeText } from '@/lib/utils';
import type { Equipo, Hallazgo, Plantilla } from '@/types/domain';

type ReportGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipo: Equipo | null;
  hallazgos: Hallazgo[];
  plantillas: Plantilla[];
};

type EditorCardProps = {
  title: string;
  badge?: string;
  html: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  onInsertTemplate?: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
};

type AutosaveState = {
  status: 'syncing' | 'saved';
  updatedAt: Date | null;
};

const MAX_MODULES = 3;

export function ReportGeneratorDialog({ open, onOpenChange, equipo, hallazgos, plantillas }: ReportGeneratorDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const editorStorageKey = equipo ? `trazadh-report-draft-${equipo.id}` : null;

  const [moduleSearch, setModuleSearch] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [observacionesHtml, setObservacionesHtml] = useState('');
  const [pendientesHtml, setPendientesHtml] = useState('');
  const [expandedEditor, setExpandedEditor] = useState(false);
  const [manualObservaciones, setManualObservaciones] = useState(false);
  const [manualPendientes, setManualPendientes] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [autosave, setAutosave] = useState<AutosaveState>({ status: 'saved', updatedAt: null });

  const moduleOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of plantillas) {
      const value = String(item.modulo || '').trim();
      if (!value) {
        continue;
      }
      const key = normalizeText(value);
      if (!unique.has(key)) {
        unique.set(key, value);
      }
    }
    return Array.from(unique.values()).sort((left, right) => left.localeCompare(right));
  }, [plantillas]);

  const pendingHallazgos = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 5);

    return hallazgos
      .filter((item) => Boolean(item.fechaHallazgo) && new Date(`${item.fechaHallazgo}T12:00:00-05:00`) >= cutoff)
      .filter((item) => normalizeText(item.idEquipo ?? '') === normalizeText(equipo?.idEquipo ?? ''))
      .filter((item) => normalizeText(item.estado) !== 'solucionado')
      .sort((left, right) => String(right.fechaHallazgo).localeCompare(String(left.fechaHallazgo)));
  }, [equipo?.idEquipo, hallazgos]);

  const previewQuery = useQuery({
    queryKey: ['report-preview', equipo?.id, selectedModules, pendingHallazgos.map((item) => item.id)],
    queryFn: () =>
      previewInforme({
        equipoId: equipo?.id,
        equipoCodigo: equipo?.idEquipo,
        modulos: selectedModules,
        hallazgoIds: pendingHallazgos.map((item) => item.id),
      }),
    enabled: open && Boolean(equipo && selectedModules.length),
    retry: 2,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createInforme({
        equipoId: equipo?.id,
        equipoCodigo: equipo?.idEquipo,
        modulos: selectedModules,
        hallazgoIds: pendingHallazgos.map((item) => item.id),
        observaciones: stripHtml(observacionesHtml),
        pendientes: stripHtml(pendientesHtml),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['informes'] });
      if (editorStorageKey) {
        window.localStorage.removeItem(editorStorageKey);
      }
      setDraftStatus('Informe guardado correctamente.');
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open || !equipo) {
      return;
    }

    const stored = loadDraft(editorStorageKey);
    if (stored) {
      setSelectedModules(stored.selectedModules?.length ? stored.selectedModules : moduleOptions.slice(0, MAX_MODULES));
      setObservacionesHtml(stored.observacionesHtml || '');
      setPendientesHtml(stored.pendientesHtml || '');
      setDraftStatus('Borrador cargado desde almacenamiento local.');
      setAutosave({ status: 'saved', updatedAt: new Date() });
      setManualObservaciones(hasMeaningfulText(stored.observacionesHtml));
      setManualPendientes(hasMeaningfulText(stored.pendientesHtml));
      return;
    }

    setSelectedModules(moduleOptions.slice(0, Math.min(MAX_MODULES, moduleOptions.length)));
    setObservacionesHtml('');
    setPendientesHtml('');
    setDraftStatus('Borrador inicial preparado.');
    setAutosave({ status: 'saved', updatedAt: null });
    setManualObservaciones(false);
    setManualPendientes(false);
  }, [editorStorageKey, moduleOptions, open, equipo]);

  useEffect(() => {
    if (!previewQuery.data) {
      return;
    }

    if (!manualObservaciones) {
      setObservacionesHtml(textToHtml(previewQuery.data.textoGenerado));
    }

    if (!manualPendientes) {
      setPendientesHtml(textToHtml(buildPendingText(pendingHallazgos)));
    }
  }, [manualObservaciones, manualPendientes, pendingHallazgos, previewQuery.data]);

  useEffect(() => {
    if (!open || !equipo) {
      return;
    }

    if (!editorStorageKey) {
      return;
    }

    setAutosave((previous) => ({ ...previous, status: 'syncing' }));

    const payload = {
      selectedModules,
      observacionesHtml,
      pendientesHtml,
    };

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(editorStorageKey, JSON.stringify(payload));
      setAutosave({ status: 'saved', updatedAt: new Date() });
    }, 550);

    return () => window.clearTimeout(timeout);
  }, [editorStorageKey, equipo, observacionesHtml, open, pendientesHtml, selectedModules]);

  const filteredModules = useMemo(() => {
    const term = normalizeText(moduleSearch);
    if (!term) {
      return moduleOptions;
    }

    return moduleOptions.filter((item) => normalizeText(item).includes(term));
  }, [moduleOptions, moduleSearch]);

  const handleModuleToggle = (moduleName: string) => {
    setManualObservaciones(false);

    setSelectedModules((current) => {
      if (current.includes(moduleName)) {
        return current.filter((item) => item !== moduleName);
      }

      if (current.length >= MAX_MODULES) {
        return current;
      }

      return [...current, moduleName];
    });
  };

  const handleSaveDraft = () => {
    if (!editorStorageKey) {
      return;
    }

    window.localStorage.setItem(
      editorStorageKey,
      JSON.stringify({
        selectedModules,
        observacionesHtml,
        pendientesHtml,
      }),
    );

    setDraftStatus('Borrador guardado manualmente.');
    setAutosave({ status: 'saved', updatedAt: new Date() });
  };

  const selectedModulesCount = selectedModules.length;
  const disabledLimitReached = selectedModulesCount >= MAX_MODULES;
  const defaultObservacionesByModules = useMemo(
    () => buildDefaultModuleText(selectedModules, plantillas),
    [selectedModules, plantillas],
  );
  const observacionesPreviewText =
    previewQuery.data?.textoGenerado?.trim() ||
    stripHtml(observacionesHtml) ||
    defaultObservacionesByModules ||
    'Sin observaciones generadas todavia.';
  const pendientesPreviewText = stripHtml(pendientesHtml) || buildPendingText(pendingHallazgos);

  useEffect(() => {
    if (manualObservaciones) {
      return;
    }

    const textoPreview = previewQuery.data?.textoGenerado?.trim();
    if (textoPreview) {
      return;
    }

    if (!defaultObservacionesByModules) {
      return;
    }

    setObservacionesHtml(textToHtml(defaultObservacionesByModules));
  }, [defaultObservacionesByModules, manualObservaciones, previewQuery.data?.textoGenerado]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[100dvh] w-[100vw] max-w-none overflow-hidden rounded-none border border-black/10 bg-[#F7F8FA] p-0 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:h-[96vh] sm:w-[97vw] sm:rounded-[20px]'>
        <div className='flex h-full flex-col'>
          <header className='border-b border-black/5 bg-white px-4 py-4 sm:px-6 sm:py-5'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-2'>
                <button
                  type='button'
                  onClick={() => onOpenChange(false)}
                  className='inline-flex items-center gap-2 text-sm font-medium text-[#C62828]'
                >
                  <ArrowLeft className='h-4 w-4' />
                </button>
                <DialogHeader className='space-y-1.5'>
                  <DialogTitle className='text-xl font-semibold leading-7 tracking-tight text-[#1F2937] sm:text-2xl sm:leading-8'>Generar informe</DialogTitle>
                  <DialogDescription className='text-sm leading-6 text-[#6B7280]'>
                    Construye, revisa y guarda el informe profesional del mantenimiento.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className='rounded-2xl border border-black/10 bg-[#FAFAFB] px-4 py-3.5'>
                <div className='flex items-center gap-2 text-xs font-semibold text-[#111827]'>
                  <span className='h-2 w-2 rounded-full bg-[#22C55E]' /> Guardado automáticamente
                </div>
                <p className='mt-1.5 text-xs leading-5 text-[#6B7280]'>
                  {autosave.status === 'syncing'
                    ? 'Sincronizando...'
                    : autosave.updatedAt
                      ? `Hace ${secondsAgo(autosave.updatedAt)} segundos`
                      : 'Sin cambios'}
                </p>
              </div>
            </div>
          </header>

          <div className='min-h-0 flex-1 overflow-hidden px-3 py-4 sm:px-4 sm:py-5 md:px-6'>
            <div className='grid h-full min-h-0 grid-cols-1 gap-5 xl:grid-cols-[40%_60%] 2xl:grid-cols-[36%_64%]'>
              <ScrollArea className='min-h-0 rounded-[18px] border border-black/5 bg-white'>
                <div className='space-y-5 p-4 sm:p-5 lg:p-6'>
                  <Card className='rounded-[18px] border-black/5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'>
                    <CardContent className='space-y-4 p-4 sm:p-5'>
                      <div className='flex items-start gap-3'>
                        <div className='grid h-10 w-10 place-items-center rounded-xl bg-[#FDF2F2] text-[#C62828]'>
                          <Building2 className='h-5 w-5' />
                        </div>
                        <div className='min-w-0 flex-1 space-y-2'>
                          <h3
                            className='min-w-0 whitespace-normal break-words text-base font-semibold leading-6 text-[#1F2937] sm:text-lg sm:leading-7 lg:text-xl lg:leading-8 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden'
                            title={equipo?.nombreEquipo ?? 'Equipo no seleccionado'}
                          >
                            {equipo?.nombreEquipo ?? 'Equipo no seleccionado'}
                          </h3>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge variant={normalizeText(equipo?.estado ?? '').includes('inact') ? 'neutral' : 'default'}>
                              {equipo?.estado ?? 'Activo'}
                            </Badge>
                            <p className='text-sm leading-6 text-[#6B7280]'>{equipo?.idEquipo ?? '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className='grid gap-2 sm:grid-cols-2'>
                        <InfoPill icon={MapPin} label='Ruta' value={equipo?.rutaNumero ?? '-'} />
                        <InfoPill icon={Settings2} label='Mantenimiento' value={equipo?.tipoMantenimiento ?? 'Preventivo'} />
                        <InfoPill icon={CalendarDays} label='Fecha' value={formatDate(new Date(), 'dd/MM/yyyy')} />
                        <InfoPill icon={Clock3} label='Horario' value={equipo?.horaProgramada ?? '08:00 - 17:00'} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className='rounded-[18px] border-black/5'>
                    <CardHeader className='space-y-3 pb-3'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <CardTitle className='text-base font-semibold leading-6 sm:text-lg'>Selección de módulos</CardTitle>
                        <Badge variant='neutral' className='text-xs'>{selectedModulesCount}/3 módulos seleccionados</Badge>
                      </div>

                      <div className='relative'>
                        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]' />
                        <Input
                          value={moduleSearch}
                          onChange={(event) => setModuleSearch(event.target.value)}
                          placeholder='Buscar módulo...'
                          className='h-11 rounded-xl border-black/10 pl-9 text-sm'
                        />
                      </div>
                    </CardHeader>

                    <CardContent className='space-y-3'>
                      <ScrollArea className='h-[220px] rounded-xl border border-black/5 bg-[#FCFCFD] p-2'>
                        <div className='space-y-1 pr-1'>
                          {filteredModules.map((moduleName) => {
                            const active = selectedModules.includes(moduleName);
                            const disabled = !active && disabledLimitReached;

                            return (
                              <button
                                key={moduleName}
                                type='button'
                                onClick={() => handleModuleToggle(moduleName)}
                                disabled={disabled}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                                  active
                                    ? 'border-[#C62828]/25 bg-[#FDF2F2]'
                                    : 'border-transparent bg-white hover:border-black/10 hover:bg-[#FAFAFB]',
                                  disabled && 'cursor-not-allowed opacity-45',
                                )}
                              >
                                <CircleDot className={cn('h-4 w-4 shrink-0', active ? 'text-[#C62828]' : 'text-[#9CA3AF]')} />
                                <span className='truncate text-sm leading-6 font-medium text-[#1F2937] flex-1'>{moduleName}</span>
                                <span
                                  className={cn(
                                    'grid h-4.5 w-4.5 shrink-0 place-items-center rounded border ml-2',
                                    active ? 'border-[#C62828] bg-[#C62828] text-white' : 'border-black/20 bg-white text-transparent',
                                  )}
                                >
                                  <Check className='h-3 w-3' />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      {disabledLimitReached ? <p className='text-xs leading-5 text-[#C62828]'>Límite alcanzado: máximo 3 módulos.</p> : null}
                    </CardContent>
                  </Card>

                </div>
              </ScrollArea>

              <ScrollArea className='min-h-0 rounded-[18px] border border-black/5 bg-white'>
                <div className='space-y-5 p-4 pb-28 sm:p-5 lg:p-6'>
                  <Card className='rounded-[18px] border-black/5'>
                    <CardHeader>
                      <CardTitle className='text-base font-semibold leading-6 sm:text-lg'>Resumen automatizado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className='rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-700'>
                        El borrador fue generado automáticamente usando las plantillas seleccionadas y los hallazgos pendientes del equipo. Puedes editarlo antes de guardarlo.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className='rounded-[18px] border-black/5'>
                    <CardHeader>
                      <CardTitle className='text-base font-semibold leading-6 sm:text-lg'>Datos automáticos del informe</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <div className='grid gap-2 text-sm text-[#374151] sm:grid-cols-2'>
                        <p><strong>Equipo:</strong> {equipo?.nombreEquipo ?? 'No seleccionado'}</p>
                        <p><strong>Código:</strong> {equipo?.idEquipo ?? '-'}</p>
                        <p><strong>Módulos:</strong> {selectedModules.length}</p>
                        <p><strong>Hallazgos incluidos:</strong> {pendingHallazgos.length}</p>
                      </div>
                      <div className='space-y-3 rounded-xl border border-black/5 bg-[#FCFCFD] p-3'>
                        <div>
                          <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-[#6B7280]'>Texto predeterminado: observaciones</p>
                          <p className='max-h-40 overflow-auto whitespace-pre-wrap text-sm text-[#111827]'>
                            {observacionesPreviewText}
                          </p>
                        </div>

                        <div>
                          <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-[#6B7280]'>Texto predeterminado: pendientes</p>
                          <p className='max-h-40 overflow-auto whitespace-pre-wrap text-sm text-[#111827]'>
                            {pendientesPreviewText}
                          </p>
                        </div>

                        <div>
                          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]'>Hallazgos incluidos</p>
                          {pendingHallazgos.length ? (
                            <ul className='max-h-44 space-y-1 overflow-auto text-sm text-[#111827]'>
                              {pendingHallazgos.map((item) => (
                                <li key={item.id} className='rounded-lg border border-black/10 bg-white px-2 py-1.5'>
                                  <span className='font-semibold'>HLL-{item.id}</span>
                                  {' · '}
                                  {item.descripcionHallazgo}
                                  {' · '}
                                  {item.modulo}
                                  {' · '}
                                  {formatDate(item.fechaHallazgo, 'dd/MM/yyyy')}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className='text-sm text-[#6B7280]'>No hay hallazgos pendientes para incluir.</p>
                          )}
                        </div>

                        {pendingHallazgos.length ? (
                          <div className='space-y-3'>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-[#6B7280]'>Solicitudes desde este informe</p>
                            {pendingHallazgos.map((item) => (
                              <div key={`sol-${item.id}`} className='rounded-xl border border-black/10 bg-white p-3'>
                                <p className='mb-2 text-sm font-semibold text-[#111827]'>
                                  HLL-{item.id} · {item.modulo}
                                </p>
                                <p className='mb-3 text-xs text-[#6B7280]'>
                                  {item.descripcionHallazgo}
                                </p>
                                <SolicitudesAsociadasCard
                                  hallazgoId={item.id}
                                  compact
                                  context={{
                                    equipoId: String(equipo?.idEquipo || item.idEquipo || ''),
                                    nombreEdificio: String(equipo?.nombreEquipo || item.nombreEquipo || ''),
                                    torreAscensor: String(equipo?.nombreEquipo || item.nombreEquipo || ''),
                                    rutaNumero: String(equipo?.rutaNumero || user?.rutaNumero || ''),
                                    solicitante: String(user?.nombre || user?.usuario || 'Tecnico ruta'),
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className='rounded-[18px] border-black/5'>
                    <CardHeader className='space-y-3'>
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <CardTitle className='text-base font-semibold leading-6 sm:text-lg'>Plantillas seleccionadas</CardTitle>
                        <Badge variant='neutral' className='text-xs'>{selectedModulesCount} seleccionadas</Badge>
                      </div>

                      <div className='flex flex-wrap gap-2'>
                        {selectedModules.length ? (
                          selectedModules.map((moduleName) => (
                            <button
                              key={moduleName}
                              type='button'
                              onClick={() => handleModuleToggle(moduleName)}
                              className='inline-flex items-center gap-2 rounded-full border border-[#C62828]/20 bg-[#FDF2F2] px-3 py-1.5 text-sm font-medium text-[#C62828]'
                            >
                              {moduleName}
                              <Plus className='h-3.5 w-3.5 rotate-45' />
                            </button>
                          ))
                        ) : (
                          <p className='text-sm text-[#6B7280]'>Selecciona módulos para generar contenido automático.</p>
                        )}
                      </div>
                    </CardHeader>
                  </Card>

                  <EditorCard
                    title='Observaciones'
                    badge='Generado automáticamente'
                    html={observacionesHtml}
                    onChange={(value) => {
                      setManualObservaciones(true);
                      setObservacionesHtml(value);
                    }}
                    placeholder='Escribe observaciones del informe...'
                    icon={PenLine}
                    description='Contenido completamente editable por el técnico.'
                    onInsertTemplate={() => {
                      if (!selectedModules.length) {
                        return;
                      }
                      const block = selectedModules.map((moduleName) => `- ${moduleName}: pendiente de revisión técnica.`).join('\n');
                      setManualObservaciones(true);
                      setObservacionesHtml((current) => `${current}${current ? '<p><br /></p>' : ''}${textToHtml(block)}`);
                    }}
                    onToggleExpand={() => setExpandedEditor((prev) => !prev)}
                    expanded={expandedEditor}
                  />

                  <EditorCard
                    title='Pendientes'
                    badge='Editable'
                    html={pendientesHtml}
                    onChange={(value) => {
                      setManualPendientes(true);
                      setPendientesHtml(value);
                    }}
                    placeholder='Lista de pendientes para seguimiento...'
                    icon={FileText}
                    description='Basado en hallazgos pendientes, editable antes de guardar.'
                  />
                </div>
              </ScrollArea>
            </div>
          </div>

          <footer className='border-t border-black/5 bg-white px-4 py-3 sm:px-6 sm:py-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-xs text-[#6B7280]'>{draftStatus || 'Los cambios se guardan automáticamente mientras escribes.'}</p>
              <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center'>
                <Button variant='secondary' className='w-full sm:w-auto' onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button variant='outline' className='w-full sm:w-auto' onClick={handleSaveDraft} disabled={!equipo}>Guardar borrador</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !equipo || !selectedModules.length}
                  className='w-full bg-[#C62828] text-white hover:bg-[#B71C1C] sm:w-auto'
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Guardando...
                    </>
                  ) : (
                    'Guardar informe'
                  )}
                </Button>
              </div>
            </div>
            {createMutation.isError ? <p className='mt-2 text-sm text-[#C62828]'>{(createMutation.error as Error).message}</p> : null}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorCard({ title, badge, html, onChange, placeholder, icon: Icon, description, onInsertTemplate, onToggleExpand, expanded }: EditorCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    if (element.innerHTML !== html) {
      element.innerHTML = html || '<p><br /></p>';
    }
  }, [html]);

  const runCommand = (command: string) => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.focus();
    document.execCommand(command, false);
    onChange(element.innerHTML);
  };

  return (
    <Card className='rounded-[18px] border-black/5'>
      <CardHeader className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='grid h-10 w-10 place-items-center rounded-xl bg-[#FDF2F2] text-[#C62828]'>
              <Icon className='h-5 w-5' />
            </div>
            <div>
              <CardTitle className='text-lg'>{title}</CardTitle>
              {description ? <p className='mt-1 text-sm text-[#6B7280]'>{description}</p> : null}
            </div>
          </div>
          {badge ? <Badge variant='neutral'>{badge}</Badge> : null}
        </div>

        <div className='flex flex-wrap items-center gap-1 rounded-xl border border-black/10 bg-[#FAFAFB] p-1.5'>
          <ToolbarButton icon={Bold} label='Negrilla' onClick={() => runCommand('bold')} />
          <ToolbarButton icon={Italic} label='Cursiva' onClick={() => runCommand('italic')} />
          <ToolbarButton icon={Underline} label='Subrayado' onClick={() => runCommand('underline')} />
          <ToolbarButton icon={List} label='Lista' onClick={() => runCommand('insertUnorderedList')} />
          <ToolbarButton icon={ListOrdered} label='Lista ordenada' onClick={() => runCommand('insertOrderedList')} />
          <ToolbarButton icon={Undo2} label='Deshacer' onClick={() => runCommand('undo')} />
          <ToolbarButton icon={Redo2} label='Rehacer' onClick={() => runCommand('redo')} />

          <div className='mx-1 h-6 w-px bg-black/10' />

          {onInsertTemplate ? <ToolbarButton icon={Plus} label='Insertar plantilla' onClick={onInsertTemplate} /> : null}
          {onToggleExpand ? <ToolbarButton icon={Maximize2} label='Expandir editor' onClick={onToggleExpand} active={Boolean(expanded)} /> : null}
        </div>
      </CardHeader>

      <CardContent>
        <div className='relative rounded-xl border border-black/10 bg-white'>
          <div
            ref={ref}
            role='textbox'
            aria-multiline='true'
            contentEditable
            suppressContentEditableWarning
            onInput={(event) => onChange(event.currentTarget.innerHTML)}
            className={cn(
              'rounded-xl px-4 py-4 text-sm leading-7 text-[#111827] outline-none',
              expanded ? 'min-h-[320px]' : 'min-h-[180px]',
            )}
            data-placeholder={placeholder}
          />
          {!html ? <span className='pointer-events-none absolute left-4 top-4 text-sm text-[#9CA3AF]'>{placeholder}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ToolbarButton({ icon: Icon, label, onClick, active = false }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; active?: boolean; }) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-lg border border-transparent text-[#6B7280] hover:border-black/10 hover:bg-white hover:text-[#C62828]',
        active && 'border-[#C62828]/30 bg-[#FDF2F2] text-[#C62828]',
      )}
      aria-label={label}
      title={label}
    >
      <Icon className='h-4 w-4' />
    </Button>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; }) {
  return (
    <div className='rounded-xl border border-black/10 bg-[#FAFAFB] px-3 py-2'>
      <p className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]'>
        <Icon className='h-3 w-3' />
        {label}
      </p>
      <p className='mt-1 text-sm font-semibold text-[#111827]'>{value}</p>
    </div>
  );
}

function loadDraft(key: string | null) {
  if (!key || typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<{
      selectedModules: string[];
      observacionesHtml: string;
      pendientesHtml: string;
    }>) : null;
  } catch {
    return null;
  }
}

function stripHtml(html: string) {
  if (!html) {
    return '';
  }

  return html
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function hasMeaningfulText(value?: string) {
  if (!value) {
    return false;
  }

  return stripHtml(value).length > 0;
}

function textToHtml(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const blocks = escaped.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) {
    return '<p><br /></p>';
  }

  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const listItems = lines.filter((line) => /^[-*•]/.test(line));
      if (listItems.length && listItems.length === lines.length) {
        return `<ul>${listItems.map((line) => `<li>${line.replace(/^[-*•]\s*/, '')}</li>`).join('')}</ul>`;
      }

      return `<p>${lines.join('<br />')}</p>`;
    })
    .join('');
}

function buildDefaultModuleText(selectedModules: string[], plantillas: Plantilla[]) {
  if (!selectedModules.length) {
    return '';
  }

  const byModulo = new Map<string, string>();
  for (const plantilla of plantillas) {
    const key = normalizeText(plantilla.modulo || '');
    if (!key || byModulo.has(key)) {
      continue;
    }

    byModulo.set(key, (plantilla.observacionEstandar || '').trim());
  }

  return selectedModules
    .map((modulo) => {
      const key = normalizeText(modulo);
      const observacion = byModulo.get(key) || 'Sin texto de plantilla configurado para este modulo.';
      return `Modulo: ${modulo}\n${observacion}`;
    })
    .join('\n\n');
}

function buildPendingText(hallazgos: Hallazgo[]) {
  if (!hallazgos.length) {
    return 'No se registran pendientes abiertos para el equipo en el periodo evaluado.';
  }

  return hallazgos
    .map((item) => `• ${item.descripcionHallazgo} (${item.modulo}, ${formatDate(item.fechaHallazgo, 'dd/MM/yyyy')})`)
    .join('\n');
}

function secondsAgo(date: Date) {
  return Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
}

