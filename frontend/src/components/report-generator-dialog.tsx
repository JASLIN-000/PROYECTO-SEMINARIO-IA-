import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bold,
  Check,
  Clock3,
  Italic,
  List,
  ListOrdered,
  Loader2,
  MapPin,
  Redo2,
  Search,
  Settings2,
  Underline,
  Undo2,
  X,
  Gauge,
  ClipboardList,
  Building2,
  PenLine,
  ListChecks,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/status-badge';
import { createInforme, previewInforme } from '@/services/informes.service';
import { cn, formatDate, normalizeText } from '@/lib/utils';
import type { Equipo, Hallazgo, Plantilla } from '@/types/domain';

type ReportGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipo: Equipo | null;
  hallazgos: Hallazgo[];
  plantillas: Plantilla[];
  onOpenHistory: (equipo: Equipo) => void;
};

type EditorCardProps = {
  title: string;
  badge?: string;
  html: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
};

const MAX_MODULES = 3;

export function ReportGeneratorDialog({ open, onOpenChange, equipo, hallazgos, plantillas, onOpenHistory }: ReportGeneratorDialogProps) {
  const queryClient = useQueryClient();
  const editorStorageKey = equipo ? `trazadh-report-draft-${equipo.id}` : null;

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

  const recentHallazgos = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 5);

    return hallazgos
      .filter((item) => Boolean(item.fechaHallazgo) && new Date(`${item.fechaHallazgo}T12:00:00-05:00`) >= cutoff)
      .filter((item) => normalizeText(item.idEquipo ?? '') === normalizeText(equipo?.idEquipo ?? ''))
      .sort((left, right) => String(right.fechaHallazgo).localeCompare(String(left.fechaHallazgo)));
  }, [equipo?.idEquipo, hallazgos]);

  const [moduleSearch, setModuleSearch] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedHallazgoIds, setSelectedHallazgoIds] = useState<number[]>([]);
  const [observacionesHtml, setObservacionesHtml] = useState('');
  const [recomendacionesHtml, setRecomendacionesHtml] = useState('');
  const [pendientesHtml, setPendientesHtml] = useState('');
  const [showAllHallazgos, setShowAllHallazgos] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');

  const previewQuery = useQuery({
    queryKey: ['report-preview', equipo?.id, selectedModules, selectedHallazgoIds],
    queryFn: () =>
      previewInforme({
        equipoId: equipo?.id,
        equipoCodigo: equipo?.idEquipo,
        modulos: selectedModules,
        hallazgoIds: selectedHallazgoIds.length ? selectedHallazgoIds : undefined,
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
        hallazgoIds: selectedHallazgoIds.length ? selectedHallazgoIds : undefined,
        observaciones: stripHtml(observacionesHtml),
        recomendaciones: stripHtml(recomendacionesHtml),
        pendientes: stripHtml(pendientesHtml),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['informes'] });
      if (editorStorageKey) {
        window.localStorage.removeItem(editorStorageKey);
      }
      setDraftStatus('Informe generado correctamente.');
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
      setSelectedHallazgoIds(stored.selectedHallazgoIds ?? []);
      setObservacionesHtml(stored.observacionesHtml || '');
      setRecomendacionesHtml(stored.recomendacionesHtml || '');
      setPendientesHtml(stored.pendientesHtml || '');
      setDraftStatus('Borrador cargado desde almacenamiento local.');
      return;
    }

    setSelectedModules(moduleOptions.slice(0, MAX_MODULES));
    setSelectedHallazgoIds([]);
    setObservacionesHtml('');
    setRecomendacionesHtml('');
    setPendientesHtml('');
    setDraftStatus('');
  }, [editorStorageKey, moduleOptions, open, equipo]);

  useEffect(() => {
    if (!open || !equipo) {
      return;
    }

    setRefreshing(true);
    const timeout = window.setTimeout(() => setRefreshing(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [equipo?.id, open, selectedHallazgoIds, selectedModules]);

  useEffect(() => {
    if (!previewQuery.data) {
      return;
    }

    setObservacionesHtml(textToHtml(previewQuery.data.textoGenerado));
    setRecomendacionesHtml(
      textToHtml(buildRecommendationsText(previewQuery.data.resumenHallazgos.total, previewQuery.data.resumenHallazgos.abiertos, previewQuery.data.resumenHallazgos.pendientes)),
    );
    setPendientesHtml(textToHtml(buildPendingText(recentHallazgos, selectedHallazgoIds)));
  }, [previewQuery.data, recentHallazgos, selectedHallazgoIds]);

  useEffect(() => {
    if (!editorStorageKey || !open || !equipo) {
      return;
    }

    const payload = {
      selectedModules,
      selectedHallazgoIds,
      observacionesHtml,
      recomendacionesHtml,
      pendientesHtml,
    };

    window.localStorage.setItem(editorStorageKey, JSON.stringify(payload));
  }, [editorStorageKey, equipo, observacionesHtml, open, pendientesHtml, recomendacionesHtml, selectedHallazgoIds, selectedModules]);

  const filteredModules = useMemo(() => {
    const term = normalizeText(moduleSearch);
    if (!term) {
      return moduleOptions;
    }

    return moduleOptions.filter((item) => normalizeText(item).includes(term));
  }, [moduleOptions, moduleSearch]);

  const visibleHallazgos = useMemo(() => (showAllHallazgos ? recentHallazgos : recentHallazgos.slice(0, 4)), [recentHallazgos, showAllHallazgos]);

  const handleModuleToggle = (moduleName: string) => {
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

  const handleHallazgoToggle = (hallazgoId: number) => {
    setSelectedHallazgoIds((current) => {
      if (current.includes(hallazgoId)) {
        return current.filter((item) => item !== hallazgoId);
      }

      return [...current, hallazgoId];
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
        selectedHallazgoIds,
        observacionesHtml,
        recomendacionesHtml,
        pendientesHtml,
      }),
    );
    setDraftStatus('Borrador guardado localmente.');
  };

  const selectedModulesCount = selectedModules.length;
  const disabledLimitReached = selectedModulesCount >= MAX_MODULES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[90vh] w-[90vw] max-w-none overflow-hidden rounded-[20px] border border-black/5 bg-white p-0 shadow-[0_30px_90px_rgba(17,24,39,0.16)]'>
        <div className='flex h-full flex-col'>
          <div className='border-b border-black/5 px-6 py-5'>
            <DialogHeader className='space-y-2'>
              <DialogTitle className='text-2xl'>Generar informe</DialogTitle>
              <DialogDescription className='max-w-3xl text-sm leading-6 text-[#6B7280]'>
                Flujo de trabajo profesional para construir, revisar y guardar el informe antes de enviarlo.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className='relative flex min-h-0 flex-1 overflow-hidden bg-[#FAFAFB]'>
            {(previewQuery.isFetching || refreshing) ? (
              <div className='absolute inset-0 z-10 flex items-center justify-center bg-white/65 backdrop-blur-[1px]'>
                <div className='flex items-center gap-3 rounded-full border border-black/5 bg-white px-4 py-2 shadow-soft'>
                  <Loader2 className='h-4 w-4 animate-spin text-[#8E0000]' />
                  <span className='text-sm font-medium text-[#111827]'>Actualizando borrador...</span>
                </div>
              </div>
            ) : null}

            <div className='grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[35%_65%]'>
              <ScrollArea className='min-h-0 border-b border-black/5 lg:border-b-0 lg:border-r'>
                <div className='space-y-6 p-6'>
                <Card className='rounded-[20px] border-black/5 shadow-none'>
                  <CardContent className='space-y-4 p-5'>
                    <div className='flex items-start gap-4'>
                      <div className='grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FDF2F2] text-[#8E0000]'>
                        <Building2 className='h-6 w-6' />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <h3 className='truncate font-display text-lg font-semibold text-[#111827]'>{equipo?.nombreEquipo}</h3>
                          <StatusBadge status={equipo?.estado} />
                        </div>
                        <p className='mt-1 text-sm text-[#6B7280]'>{equipo?.idEquipo}</p>
                      </div>
                    </div>

                    <div className='grid gap-3 sm:grid-cols-2'>
                      <InfoRow icon={MapPin} label='Ruta' value={equipo?.rutaNumero ?? '-'} />
                      <InfoRow icon={Settings2} label='Tipo de mantenimiento' value={equipo?.tipoMantenimiento ?? 'Preventivo'} />
                      <InfoRow icon={Clock3} label='Horario programado' value={equipo?.horaProgramada ?? '08:00 - 17:00'} />
                      <InfoRow icon={Gauge} label='SLA DH' value={equipo?.acuerdoNivelServicioDh ? `${equipo.acuerdoNivelServicioDh} DH` : '-'} />
                    </div>
                  </CardContent>
                </Card>

                <Card className='rounded-[20px] border-black/5 shadow-none'>
                  <CardHeader className='pb-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <CardTitle>Selección de módulos</CardTitle>
                        <p className='mt-1 text-sm text-[#6B7280]'>Selecciona hasta tres módulos para el borrador.</p>
                      </div>
                      <Badge variant='neutral' className='rounded-full px-3 py-1.5'>
                        {selectedModulesCount} / 3 módulos seleccionados
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='relative'>
                      <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]' />
                      <Input
                        value={moduleSearch}
                        onChange={(event) => setModuleSearch(event.target.value)}
                        placeholder='Buscar módulo...'
                        className='h-11 rounded-2xl border-black/5 pl-9'
                      />
                    </div>

                    <ScrollArea className='h-[350px] rounded-[20px] border border-black/5 bg-white p-2'>
                      <div className='space-y-2 pr-1'>
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
                                'flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition-all duration-200',
                                active
                                  ? 'border-[#C62828]/35 bg-[#FDF2F2] shadow-[0_10px_30px_rgba(198,40,40,0.10)]'
                                  : 'border-transparent bg-white hover:border-black/5 hover:bg-[#FAFAFB]',
                                disabled && 'cursor-not-allowed opacity-50',
                              )}
                            >
                              <div className='flex min-w-0 items-center gap-3'>
                                <span
                                  className={cn(
                                    'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
                                    active ? 'border-[#C62828] bg-[#C62828] text-white' : 'border-black/15 bg-white text-transparent',
                                  )}
                                >
                                  <Check className='h-3.5 w-3.5' />
                                </span>
                                <span className='truncate text-sm font-medium text-[#111827]'>{moduleName}</span>
                              </div>
                              <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-[#C62828]' : 'bg-[#E5E7EB]')} />
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {disabledLimitReached ? (
                      <p className='text-xs font-medium text-[#8E0000]'>Solo es posible seleccionar hasta tres módulos.</p>
                    ) : (
                      <p className='text-xs text-[#6B7280]'>Selecciona módulos para regenerar automáticamente la vista previa.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className='rounded-[20px] border-black/5 shadow-none'>
                  <CardHeader className='pb-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <CardTitle>Hallazgos pendientes</CardTitle>
                        <p className='mt-1 text-sm text-[#6B7280]'>Últimos 5 meses de la ruta seleccionada.</p>
                      </div>
                      <Button variant='outline' size='sm' onClick={() => (equipo ? onOpenHistory(equipo) : undefined)}>
                        Consultar historial completo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {visibleHallazgos.length ? (
                      visibleHallazgos.map((item) => {
                        const selected = selectedHallazgoIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type='button'
                            onClick={() => handleHallazgoToggle(item.id)}
                            className={cn(
                              'w-full rounded-[18px] border p-4 text-left transition-all duration-200',
                              selected
                                ? 'border-[#C62828]/35 bg-[#FDF2F2] shadow-[0_8px_24px_rgba(198,40,40,0.10)]'
                                : 'border-black/5 bg-white hover:border-black/10 hover:bg-[#FAFAFB]',
                            )}
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div className='min-w-0'>
                                <p className='truncate text-sm font-semibold text-[#111827]'>{item.modulo}</p>
                                <p className='mt-1 text-xs text-[#6B7280]'>{item.descripcionHallazgo}</p>
                              </div>
                              <span
                                className={cn(
                                  'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
                                  selected ? 'border-[#C62828] bg-[#C62828] text-white' : 'border-black/15 bg-white text-transparent',
                                )}
                              >
                                <Check className='h-3.5 w-3.5' />
                              </span>
                            </div>

                            <div className='mt-4 flex flex-wrap items-center gap-2'>
                              <StatusBadge status={item.estado} />
                              <Badge variant={priorityTone(item.estado)} className='rounded-full'>
                                {priorityLabel(item.estado)}
                              </Badge>
                              <Badge variant='neutral' className='rounded-full'>
                                {formatDate(item.fechaHallazgo, 'dd/MM/yyyy')}
                              </Badge>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className='rounded-[18px] border border-dashed border-black/10 bg-white p-4 text-sm text-[#6B7280]'>
                        No hay hallazgos pendientes para este equipo en los últimos cinco meses.
                      </div>
                    )}

                    <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
                      <Button variant='ghost' onClick={() => setShowAllHallazgos((value) => !value)}>
                        Ver todos
                      </Button>
                      <p className='text-xs text-[#6B7280]'>
                        {selectedHallazgoIds.length ? `${selectedHallazgoIds.length} hallazgos influyen en el borrador.` : 'Sin hallazgos seleccionados.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </ScrollArea>

              <ScrollArea className='min-h-0 bg-white'>
                <div className='space-y-6 p-6 pb-28'>
                <Card className='rounded-[20px] border-black/5 shadow-none'>
                  <CardHeader className='space-y-3'>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <CardTitle>Resumen automatizado</CardTitle>
                        <p className='mt-1 text-sm text-[#6B7280]'>
                          El sistema generó automáticamente el borrador utilizando las plantillas seleccionadas y los hallazgos pendientes del equipo.
                        </p>
                      </div>
                      <Badge variant='neutral' className='rounded-full'>Generado automáticamente</Badge>
                    </div>
                    <div className='rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700'>
                      La información puede editarse antes de guardar el informe.
                    </div>
                  </CardHeader>
                </Card>

                <Card className='rounded-[20px] border-black/5 shadow-none'>
                  <CardHeader className='space-y-3'>
                    <div className='flex items-center justify-between gap-4'>
                      <CardTitle>Plantillas seleccionadas</CardTitle>
                      <Badge variant='neutral' className='rounded-full'>{selectedModulesCount} seleccionadas</Badge>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {selectedModules.length ? (
                        selectedModules.map((moduleName) => (
                          <button
                            key={moduleName}
                            type='button'
                            onClick={() => handleModuleToggle(moduleName)}
                            className='inline-flex items-center gap-2 rounded-full border border-[#C62828]/15 bg-[#FDF2F2] px-3 py-2 text-sm font-medium text-[#8E0000] transition-colors hover:border-[#C62828]/30'
                          >
                            {moduleName}
                            <X className='h-3.5 w-3.5' />
                          </button>
                        ))
                      ) : (
                        <p className='text-sm text-[#6B7280]'>Selecciona hasta tres módulos para construir los chips del informe.</p>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                <EditorCard
                  title='Observaciones'
                  badge='Generado automáticamente'
                  html={observacionesHtml}
                  onChange={setObservacionesHtml}
                  placeholder='Escribe observaciones del informe...'
                  icon={PenLine}
                  description='Editor enriquecido para el cuerpo principal del informe.'
                />

                <EditorCard
                  title='Recomendaciones'
                  badge='Editable'
                  html={recomendacionesHtml}
                  onChange={setRecomendacionesHtml}
                  placeholder='Añade recomendaciones operativas...'
                  icon={ListChecks}
                />

                <EditorCard
                  title='Pendientes'
                  badge='Editable'
                  html={pendientesHtml}
                  onChange={setPendientesHtml}
                  placeholder='Registra pendientes y próximos pasos...'
                  icon={ClipboardList}
                />
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className='shrink-0 border-t border-black/5 bg-white px-6 py-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='space-y-1'>
                <p className='text-sm font-semibold text-[#111827]'>Flujo listo para guardar</p>
                <p className='text-xs text-[#6B7280]'>{draftStatus || 'El borrador se actualizará automáticamente con cada cambio.'}</p>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Button variant='secondary' onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button variant='outline' onClick={handleSaveDraft} disabled={!equipo || !selectedModules.length}>Guardar borrador</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !equipo || !selectedModules.length}
                >
                  {createMutation.isPending ? 'Generando...' : 'Generar informe'}
                </Button>
              </div>
            </div>
            {createMutation.isError ? <p className='mt-2 text-sm text-[#C62828]'>{(createMutation.error as Error).message}</p> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorCard({ title, badge, html, onChange, placeholder, icon: Icon, description }: EditorCardProps) {
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
    <Card className='rounded-[20px] border-black/5 shadow-none'>
      <CardHeader className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='grid h-10 w-10 place-items-center rounded-2xl bg-[#FDF2F2] text-[#8E0000]'>
              <Icon className='h-5 w-5' />
            </div>
            <div>
              <CardTitle className='text-base'>{title}</CardTitle>
              {description ? <p className='mt-1 text-sm text-[#6B7280]'>{description}</p> : null}
            </div>
          </div>
          {badge ? <Badge variant='neutral' className='rounded-full'>{badge}</Badge> : null}
        </div>

        <div className='flex flex-wrap items-center gap-1 rounded-[16px] border border-black/5 bg-[#FAFAFB] p-2'>
          <ToolbarButton icon={Bold} label='Negrita' onClick={() => runCommand('bold')} />
          <ToolbarButton icon={Italic} label='Cursiva' onClick={() => runCommand('italic')} />
          <ToolbarButton icon={Underline} label='Subrayado' onClick={() => runCommand('underline')} />
          <ToolbarButton icon={List} label='Lista' onClick={() => runCommand('insertUnorderedList')} />
          <ToolbarButton icon={ListOrdered} label='Numeración' onClick={() => runCommand('insertOrderedList')} />
          <div className='mx-1 h-6 w-px bg-black/10' />
          <ToolbarButton icon={Undo2} label='Deshacer' onClick={() => runCommand('undo')} />
          <ToolbarButton icon={Redo2} label='Rehacer' onClick={() => runCommand('redo')} />
        </div>
      </CardHeader>

      <CardContent className='space-y-3'>
        <div className='relative rounded-[18px] border border-black/5 bg-white shadow-[0_1px_0_rgba(17,24,39,0.02)]'>
          <div
            ref={ref}
            role='textbox'
            aria-multiline='true'
            contentEditable
            suppressContentEditableWarning
            onInput={(event) => onChange(event.currentTarget.innerHTML)}
            className='min-h-[180px] rounded-[18px] px-4 py-4 text-sm leading-6 text-[#111827] outline-none'
            data-placeholder={placeholder}
          />
          {!html ? <span className='pointer-events-none absolute left-4 top-4 text-sm text-[#9CA3AF]'>{placeholder}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ToolbarButton({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; }) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className='h-9 w-9 rounded-xl border border-transparent text-[#6B7280] hover:border-black/5 hover:bg-white hover:text-[#8E0000]'
      aria-label={label}
      title={label}
    >
      <Icon className='h-4 w-4' />
    </Button>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; }) {
  return (
    <div className='rounded-[16px] border border-black/5 bg-white px-4 py-3'>
      <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]'>
        <Icon className='h-3.5 w-3.5' />
        {label}
      </div>
      <p className='mt-2 text-sm font-semibold text-[#111827]'>{value}</p>
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
      selectedHallazgoIds: number[];
      observacionesHtml: string;
      recomendacionesHtml: string;
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

function buildRecommendationsText(total: number, abiertos: number, pendientes: number) {
  if (!total) {
    return 'Mantener la programacion preventiva y documentar novedades durante la intervencion.';
  }

  return [
    `Priorizar cierre de ${abiertos + pendientes} hallazgos activos antes del cierre formal del equipo.`,
    'Validar condiciones mecánicas, eléctricas y de seguridad antes de liberar el mantenimiento.',
    'Registrar evidencias, ajustes y observaciones finales en el informe.'
  ].join('\n\n');
}

function buildPendingText(hallazgos: Hallazgo[], selectedIds: number[]) {
  const base = hallazgos.filter((item) => selectedIds.length === 0 || selectedIds.includes(item.id));
  if (!base.length) {
    return 'No se registran pendientes abiertos para el equipo en el periodo evaluado.';
  }

  return base
    .map((item) => `${item.modulo}: ${item.descripcionHallazgo}`)
    .slice(0, 5)
    .join('\n');
}

function priorityLabel(status: string) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'ABIERTO') {
    return 'Alta';
  }

  if (normalized === 'PENDIENTE') {
    return 'Media';
  }

  return 'Baja';
}

function priorityTone(status: string) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'ABIERTO') {
    return 'warning';
  }

  return 'neutral';
}