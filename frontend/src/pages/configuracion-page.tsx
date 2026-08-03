import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, Copy, ExternalLink, Link2, MoonStar, RefreshCw, ShieldUser, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { buildGoogleSolicitudUrl, type SolicitudFormContext, type SolicitudFormType } from '@/lib/google-forms';
import {
  clearFormsIntegrationConfig,
  getFormsIntegrationConfig,
  saveFormsIntegrationConfig,
  type FormsIntegrationConfig,
} from '@/lib/forms-integration-config';

const blocks = [
  {
    title: 'Perfil',
    description: 'Gestion de informacion del tecnico y datos de sesion.',
    icon: ShieldUser,
  },
  {
    title: 'Notificaciones',
    description: 'Preferencias para alertas de mantenimientos y hallazgos.',
    icon: Bell,
  },
  {
    title: 'Tema',
    description: 'Opciones de apariencia y contraste para la interfaz.',
    icon: MoonStar,
  },
  {
    title: 'Informacion del sistema',
    description: 'Version del cliente y estado de conectividad con API.',
    icon: Wrench,
  },
];

export function ConfiguracionPage() {
  const [formConfig, setFormConfig] = useState<FormsIntegrationConfig>(() => getFormsIntegrationConfig());
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [previewContext, setPreviewContext] = useState<SolicitudFormContext>({
    equipoId: '4696S-01',
    nombreEdificio: 'Edificio Demo',
    torreAscensor: 'Torre A - Ascensor 1',
    rutaNumero: 'R-12',
    solicitante: 'Tecnico Demo',
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewCopied, setPreviewCopied] = useState(false);

  const canSave = useMemo(
    () => Boolean(formConfig.cotizacionUrl.trim() && formConfig.pedidoUrl.trim()),
    [formConfig.cotizacionUrl, formConfig.pedidoUrl],
  );

  const saveConfig = () => {
    saveFormsIntegrationConfig(formConfig);
    setSavedAt(new Date());
  };

  const resetConfig = () => {
    clearFormsIntegrationConfig();
    setFormConfig(getFormsIntegrationConfig());
    setSavedAt(null);
    setPreviewUrl('');
    setPreviewError('');
    setPreviewCopied(false);
  };

  const mapeoResumen = useMemo(() => {
    const cotizacionCount = [
      formConfig.cotizacionEntryEquipoId,
      formConfig.cotizacionEntryNombreEdificio,
      formConfig.cotizacionEntryTorreAscensor,
      formConfig.cotizacionEntryRutaNumero,
      formConfig.cotizacionEntrySolicitante,
    ].filter((value) => String(value || '').trim()).length;

    const pedidoCount = [
      formConfig.pedidoEntryEquipoId,
      formConfig.pedidoEntryNombreEdificio,
      formConfig.pedidoEntryTorreAscensor,
      formConfig.pedidoEntryRutaNumero,
      formConfig.pedidoEntrySolicitante,
    ].filter((value) => String(value || '').trim()).length;

    return { cotizacionCount, pedidoCount };
  }, [
    formConfig.cotizacionEntryEquipoId,
    formConfig.cotizacionEntryNombreEdificio,
    formConfig.cotizacionEntryTorreAscensor,
    formConfig.cotizacionEntryRutaNumero,
    formConfig.cotizacionEntrySolicitante,
    formConfig.pedidoEntryEquipoId,
    formConfig.pedidoEntryNombreEdificio,
    formConfig.pedidoEntryTorreAscensor,
    formConfig.pedidoEntryRutaNumero,
    formConfig.pedidoEntrySolicitante,
  ]);

  const openPrefillPreview = (type: SolicitudFormType) => {
    setPreviewError('');
    setPreviewCopied(false);

    try {
      // Use current form values (even unsaved) for immediate diagnostics.
      saveFormsIntegrationConfig(formConfig);
      const url = buildGoogleSolicitudUrl(type, previewContext);
      setPreviewUrl(url);

      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        setPreviewError('El navegador bloqueó la ventana emergente de prueba. Habilita pop-ups para continuar.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar la URL de prueba.';
      setPreviewError(message);
    }
  };

  const copyPreviewUrl = async () => {
    if (!previewUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(previewUrl);
      setPreviewCopied(true);
    } catch {
      setPreviewError('No se pudo copiar la URL.');
    }
  };

  return (
    <section className='space-y-6'>
      <PageHeader title='Configuracion' description='Estructura inicial de opciones del sistema.' />

      <Card className='border-[#F4DDE1]'>
        <CardHeader className='space-y-2'>
          <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF2F2] text-[#A11D2E]'>
            <Link2 className='h-5 w-5' />
          </div>
          <CardTitle>Integración Google Forms</CardTitle>
          <p className='text-sm text-slate-500'>
            Pega aquí los enlaces de formularios para que TrazaDH los use al generar solicitudes de cotización y pedido.
          </p>
          <p className='text-xs text-[#92400E]'>
            Recomendado para autocompletar: URL completa de Google Forms (docs.google.com/forms/.../viewform). Con links cortos forms.gle, el prellenado puede depender del redireccionamiento.
          </p>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <Field
              label='Link formulario de cotización'
              value={formConfig.cotizacionUrl}
              onChange={(value) => setFormConfig((current) => ({ ...current, cotizacionUrl: value }))}
              placeholder='https://docs.google.com/forms/d/e/.../viewform'
            />
            <Field
              label='Link formulario de pedido'
              value={formConfig.pedidoUrl}
              onChange={(value) => setFormConfig((current) => ({ ...current, pedidoUrl: value }))}
              placeholder='https://docs.google.com/forms/d/e/.../viewform'
            />
          </div>

          <div className='rounded-xl border border-black/10 bg-[#FAFAFB] p-4'>
            <p className='mb-3 text-sm font-semibold text-[#111827]'>Mapeo de campos por formulario (entry IDs de Google Forms)</p>

            <div className='rounded-xl border border-black/10 bg-white p-3'>
              <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]'>Formulario de cotización</p>
              <div className='grid gap-3 md:grid-cols-2'>
                <Field
                  label='Entry ID: ID equipo'
                  value={formConfig.cotizacionEntryEquipoId}
                  onChange={(value) => setFormConfig((current) => ({ ...current, cotizacionEntryEquipoId: value }))}
                  placeholder='entry.111111111'
                />
                <Field
                  label='Entry ID: Nombre edificio'
                  value={formConfig.cotizacionEntryNombreEdificio}
                  onChange={(value) => setFormConfig((current) => ({ ...current, cotizacionEntryNombreEdificio: value }))}
                  placeholder='entry.222222222'
                />
                <Field
                  label='Entry ID: Torre/ascensor'
                  value={formConfig.cotizacionEntryTorreAscensor}
                  onChange={(value) => setFormConfig((current) => ({ ...current, cotizacionEntryTorreAscensor: value }))}
                  placeholder='entry.333333333'
                />
                <Field
                  label='Entry ID: Ruta'
                  value={formConfig.cotizacionEntryRutaNumero}
                  onChange={(value) => setFormConfig((current) => ({ ...current, cotizacionEntryRutaNumero: value }))}
                  placeholder='entry.444444444'
                />
                <Field
                  label='Entry ID: Solicitante'
                  value={formConfig.cotizacionEntrySolicitante}
                  onChange={(value) => setFormConfig((current) => ({ ...current, cotizacionEntrySolicitante: value }))}
                  placeholder='entry.555555555'
                />
              </div>
            </div>

            <div className='mt-3 rounded-xl border border-black/10 bg-white p-3'>
              <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]'>Formulario de pedido</p>
              <div className='grid gap-3 md:grid-cols-2'>
                <Field
                  label='Entry ID: ID equipo'
                  value={formConfig.pedidoEntryEquipoId}
                  onChange={(value) => setFormConfig((current) => ({ ...current, pedidoEntryEquipoId: value }))}
                  placeholder='entry.111111111'
                />
                <Field
                  label='Entry ID: Nombre edificio'
                  value={formConfig.pedidoEntryNombreEdificio}
                  onChange={(value) => setFormConfig((current) => ({ ...current, pedidoEntryNombreEdificio: value }))}
                  placeholder='entry.222222222'
                />
                <Field
                  label='Entry ID: Torre/ascensor'
                  value={formConfig.pedidoEntryTorreAscensor}
                  onChange={(value) => setFormConfig((current) => ({ ...current, pedidoEntryTorreAscensor: value }))}
                  placeholder='entry.333333333'
                />
                <Field
                  label='Entry ID: Ruta'
                  value={formConfig.pedidoEntryRutaNumero}
                  onChange={(value) => setFormConfig((current) => ({ ...current, pedidoEntryRutaNumero: value }))}
                  placeholder='entry.444444444'
                />
                <Field
                  label='Entry ID: Solicitante'
                  value={formConfig.pedidoEntrySolicitante}
                  onChange={(value) => setFormConfig((current) => ({ ...current, pedidoEntrySolicitante: value }))}
                  placeholder='entry.555555555'
                />
              </div>
            </div>

            <p className='mb-3 mt-4 text-sm font-semibold text-[#111827]'>Mapeo general (compatibilidad)</p>
            <div className='grid gap-3 md:grid-cols-2'>
              <Field
                label='Entry ID: ID equipo'
                value={formConfig.entryEquipoId}
                onChange={(value) => setFormConfig((current) => ({ ...current, entryEquipoId: value }))}
                placeholder='entry.111111111'
              />
              <Field
                label='Entry ID: Nombre edificio'
                value={formConfig.entryNombreEdificio}
                onChange={(value) => setFormConfig((current) => ({ ...current, entryNombreEdificio: value }))}
                placeholder='entry.222222222'
              />
              <Field
                label='Entry ID: Torre/ascensor'
                value={formConfig.entryTorreAscensor}
                onChange={(value) => setFormConfig((current) => ({ ...current, entryTorreAscensor: value }))}
                placeholder='entry.333333333'
              />
              <Field
                label='Entry ID: Ruta'
                value={formConfig.entryRutaNumero}
                onChange={(value) => setFormConfig((current) => ({ ...current, entryRutaNumero: value }))}
                placeholder='entry.444444444'
              />
              <Field
                label='Entry ID: Solicitante'
                value={formConfig.entrySolicitante}
                onChange={(value) => setFormConfig((current) => ({ ...current, entrySolicitante: value }))}
                placeholder='entry.555555555'
              />
            </div>

            <label className='mt-4 inline-flex items-center gap-2 text-sm text-[#374151]'>
              <input
                type='checkbox'
                checked={formConfig.pedidoIncluirRuta}
                onChange={(event) => setFormConfig((current) => ({ ...current, pedidoIncluirRuta: event.target.checked }))}
              />
              Incluir ruta también en formulario de pedido
            </label>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            {savedAt ? (
              <p className='mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#166534]'>
                <CheckCircle2 className='h-3.5 w-3.5' />
                Guardado: {savedAt.toLocaleTimeString('es-CO')}
              </p>
            ) : null}
            <Button type='button' variant='outline' onClick={resetConfig}>
              <RefreshCw className='mr-2 h-4 w-4' /> Restablecer
            </Button>
            <Button type='button' disabled={!canSave} onClick={saveConfig} className='bg-[#A11D2E] text-white hover:bg-[#8A1627]'>
              Guardar configuración
            </Button>
          </div>

          <div className='rounded-xl border border-black/10 bg-[#FAFAFB] p-4'>
            <p className='mb-3 text-sm font-semibold text-[#111827]'>Diagnóstico de autocompletado</p>
            <p className='text-xs text-[#6B7280]'>
              Usa datos de prueba para abrir el formulario con prellenado y validar si los entry IDs están correctos.
            </p>

            <div className='mt-3 grid gap-3 md:grid-cols-2'>
              <Field
                label='Dato prueba: ID equipo'
                value={previewContext.equipoId}
                onChange={(value) => setPreviewContext((current) => ({ ...current, equipoId: value }))}
                placeholder='4696S-01'
              />
              <Field
                label='Dato prueba: Nombre edificio'
                value={previewContext.nombreEdificio}
                onChange={(value) => setPreviewContext((current) => ({ ...current, nombreEdificio: value }))}
                placeholder='Edificio Demo'
              />
              <Field
                label='Dato prueba: Torre/ascensor'
                value={previewContext.torreAscensor}
                onChange={(value) => setPreviewContext((current) => ({ ...current, torreAscensor: value }))}
                placeholder='Torre A - Ascensor 1'
              />
              <Field
                label='Dato prueba: Ruta'
                value={previewContext.rutaNumero}
                onChange={(value) => setPreviewContext((current) => ({ ...current, rutaNumero: value }))}
                placeholder='R-12'
              />
              <Field
                label='Dato prueba: Solicitante'
                value={previewContext.solicitante}
                onChange={(value) => setPreviewContext((current) => ({ ...current, solicitante: value }))}
                placeholder='Tecnico Demo'
              />
            </div>

            <div className='mt-3 flex flex-wrap items-center gap-2'>
              <Button type='button' variant='outline' onClick={() => openPrefillPreview('COTIZACION')}>
                <ExternalLink className='mr-2 h-4 w-4' /> Probar cotización
              </Button>
              <Button type='button' variant='outline' onClick={() => openPrefillPreview('PEDIDO')}>
                <ExternalLink className='mr-2 h-4 w-4' /> Probar pedido
              </Button>
              <Button type='button' variant='outline' onClick={copyPreviewUrl} disabled={!previewUrl}>
                <Copy className='mr-2 h-4 w-4' /> Copiar URL de prueba
              </Button>
            </div>

            <div className='mt-3 rounded-lg border border-black/10 bg-white p-3 text-xs text-[#374151]'>
              <p>
                Mapeo cargado: cotización {mapeoResumen.cotizacionCount}/5 · pedido {mapeoResumen.pedidoCount}/5
              </p>
              {previewUrl ? (
                <p className='mt-2 break-all'>URL generada: {previewUrl}</p>
              ) : null}
              {previewCopied ? <p className='mt-2 text-[#166534]'>URL copiada al portapapeles.</p> : null}
              {previewError ? <p className='mt-2 text-[#B42318]'>{previewError}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2'>
        {blocks.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className='flex-row items-center gap-3 space-y-0'>
                <div className='grid h-10 w-10 place-items-center rounded-xl bg-wine-100'>
                  <Icon className='h-5 w-5 text-wine-700' />
                </div>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className='text-sm text-slate-500'>{item.description}</CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <div className='space-y-1.5'>
      <label className='text-xs font-semibold uppercase tracking-wide text-[#6B7280]'>{label}</label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className='h-10 rounded-xl'
      />
    </div>
  );
}
