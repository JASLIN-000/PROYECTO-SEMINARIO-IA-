import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Box, CircleCheckBig, ExternalLink, FileText, Package, UserRound } from 'lucide-react';
import { buildGoogleSolicitudUrl, type SolicitudFormContext, type SolicitudFormType } from '@/lib/google-forms';
import { getFormsIntegrationConfig, saveFormsIntegrationConfig } from '@/lib/forms-integration-config';
import { cn } from '@/lib/utils';
import { createSolicitud, fetchSolicitudesByHallazgo, resolveGoogleFormUrl } from '@/services/hallazgos.service';
import type { Solicitud } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

type Props = {
  hallazgoId: number | null;
  context: SolicitudFormContext;
  className?: string;
  compact?: boolean;
};

type ConfirmState = {
  open: boolean;
  type: SolicitudFormType | null;
  url: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function pickLatestByType(items: Solicitud[], type: SolicitudFormType) {
  return items
    .filter((item) => String(item.tipoSolicitud).toUpperCase() === type)
    .sort((a, b) => String(b.fechaCreacion).localeCompare(String(a.fechaCreacion)))[0] ?? null;
}

export function SolicitudesAsociadasCard({ hallazgoId, context, className, compact = false }: Props) {
  const queryClient = useQueryClient();
  const [wantsCotizacion, setWantsCotizacion] = useState(false);
  const [wantsPedido, setWantsPedido] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, type: null, url: '' });
  const [formUrlError, setFormUrlError] = useState('');
  const [resolvingBaseUrl, setResolvingBaseUrl] = useState(false);
  const pendingPopupRef = useRef<Window | null>(null);

  const solicitudesQuery = useQuery({
    queryKey: ['solicitudes-hallazgo', hallazgoId],
    queryFn: () => fetchSolicitudesByHallazgo(Number(hallazgoId)),
    enabled: Boolean(hallazgoId),
    retry: 2,
  });

  const latestCotizacion = useMemo(
    () => pickLatestByType(solicitudesQuery.data ?? [], 'COTIZACION'),
    [solicitudesQuery.data],
  );

  const latestPedido = useMemo(
    () => pickLatestByType(solicitudesQuery.data ?? [], 'PEDIDO'),
    [solicitudesQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: ({ type, url }: { type: SolicitudFormType; url: string }) => {
      if (!hallazgoId) {
        throw new Error('Guarda el hallazgo antes de generar solicitudes.');
      }

      return createSolicitud(hallazgoId, {
        tipoSolicitud: type,
        urlFormulario: url,
        estado: 'GENERADA',
      });
    },
    onSuccess: () => {
      setConfirm({ open: false, type: null, url: '' });
      setFormUrlError('');
      pendingPopupRef.current = null;

      // Do not block popup navigation while refreshing local query cache.
      void queryClient.invalidateQueries({ queryKey: ['solicitudes-hallazgo', hallazgoId] });
    },
    onError: () => {
      pendingPopupRef.current = null;
    },
  });

  const openConfirm = async (type: SolicitudFormType) => {
    setFormUrlError('');
    let url = '';
    try {
      const currentConfig = getFormsIntegrationConfig();
      const currentBaseUrl = type === 'COTIZACION' ? currentConfig.cotizacionUrl : currentConfig.pedidoUrl;

      let normalizedBaseUrl = currentBaseUrl;
      try {
        setResolvingBaseUrl(true);
        const resolved = await resolveGoogleFormUrl(currentBaseUrl);
        const candidate = String(resolved?.resolvedUrl || '').trim();
        if (candidate) {
          normalizedBaseUrl = candidate;
        }

        if (resolved?.requiresAuth) {
          setFormUrlError('Este formulario requiere inicio de sesión de Google. En ese modo, Google puede no respetar el autocompletado. Publica el formulario para “Cualquier persona con el enlace” o desactiva la restricción de inicio de sesión.');
        }
      } catch {
        // keep original URL; builder will surface validation error if invalid.
      }

      if (normalizedBaseUrl !== currentBaseUrl) {
        saveFormsIntegrationConfig({
          ...currentConfig,
          cotizacionUrl: type === 'COTIZACION' ? normalizedBaseUrl : currentConfig.cotizacionUrl,
          pedidoUrl: type === 'PEDIDO' ? normalizedBaseUrl : currentConfig.pedidoUrl,
        });
      }

      url = buildGoogleSolicitudUrl(type, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo construir la URL del formulario.';
      setFormUrlError(message);
      setResolvingBaseUrl(false);
      return;
    }

    setResolvingBaseUrl(false);

    setConfirm({
      open: true,
      type,
      url,
    });
  };

  const disabledByMutation = createMutation.isPending;

  return (
    <Card className={cn('rounded-2xl border border-black/5 bg-white shadow-[0_6px_20px_rgba(17,24,39,0.05)]', className)}>
      <CardHeader className='space-y-2'>
        <CardTitle className='text-lg text-[#111827]'>Solicitudes asociadas</CardTitle>
        <p className='text-sm text-[#6B7280]'>
          Si este hallazgo requiere materiales o cotización puedes generar la solicitud directamente desde TrazaDH.
        </p>
      </CardHeader>
      <CardContent className='space-y-4'>
        <SolicitudBlock
          title='¿Este hallazgo requiere cotización?'
          icon={FileText}
          checked={wantsCotizacion}
          onCheckedChange={setWantsCotizacion}
          infoTitle='Cotización requerida'
          infoText='TrazaDH enviará automáticamente la información general del equipo al formulario de Google. Solo deberás diligenciar el código, nombre y cantidad del elemento.'
          buttonLabel='Generar cotización'
          latest={latestCotizacion}
          actionColor='bg-[#A11D2E] hover:bg-[#8A1627]'
          disabled={disabledByMutation || resolvingBaseUrl}
          onClick={() => openConfirm('COTIZACION')}
          compact={compact}
        />

        <SolicitudBlock
          title='¿Este hallazgo requiere pedido de materiales?'
          icon={Box}
          checked={wantsPedido}
          onCheckedChange={setWantsPedido}
          infoTitle='Pedido requerido'
          infoText='TrazaDH completará automáticamente la información del equipo y del solicitante. Solo deberás indicar los materiales requeridos.'
          buttonLabel='Generar pedido'
          latest={latestPedido}
          actionColor='bg-[#A11D2E] hover:bg-[#8A1627]'
          disabled={disabledByMutation || resolvingBaseUrl}
          onClick={() => openConfirm('PEDIDO')}
          compact={compact}
        />

        {!hallazgoId ? (
          <p className='rounded-xl border border-[#F4DDE1] bg-[#FDF4F6] px-3 py-2 text-xs font-medium text-[#A11D2E]'>
            Puedes revisar el formulario en el modal. Para registrar trazabilidad y abrir Google Forms, primero guarda el hallazgo.
          </p>
        ) : null}

        {solicitudesQuery.isLoading ? <p className='text-xs text-[#6B7280]'>Cargando solicitudes asociadas...</p> : null}
        {solicitudesQuery.isError ? (
          <p className='inline-flex items-center gap-2 text-xs text-[#B42318]'>
            <AlertCircle className='h-3.5 w-3.5' />
            No se pudieron cargar las solicitudes registradas.
          </p>
        ) : null}
        {createMutation.isError ? (
          <p className='inline-flex items-center gap-2 text-xs text-[#B42318]'>
            <AlertCircle className='h-3.5 w-3.5' />
            {(createMutation.error as Error).message}
          </p>
        ) : null}
        {formUrlError ? (
          <p className='inline-flex items-center gap-2 text-xs text-[#B42318]'>
            <AlertCircle className='h-3.5 w-3.5' />
            {formUrlError}
          </p>
        ) : null}
        {resolvingBaseUrl ? <p className='text-xs text-[#6B7280]'>Validando enlace del formulario...</p> : null}
      </CardContent>

      <Dialog open={confirm.open} onOpenChange={(open) => setConfirm((current) => ({ ...current, open }))}>
        <DialogContent className='max-w-[640px] rounded-2xl'>
          <DialogHeader>
            <DialogTitle>
              {confirm.type === 'COTIZACION' ? 'Generar solicitud de cotización' : 'Generar pedido de materiales'}
            </DialogTitle>
            <DialogDescription>Verifica la información antes de continuar.</DialogDescription>
          </DialogHeader>

          <div className='space-y-3'>
            <div className='grid gap-2 rounded-xl border border-black/10 bg-[#FAFAFB] p-3 text-sm'>
              <ReadOnlyItem label='ID del equipo' value={context.equipoId} />
              <ReadOnlyItem label='Nombre del edificio' value={context.nombreEdificio} />
              {confirm.type === 'COTIZACION' ? <ReadOnlyItem label='Torre y/o número del ascensor' value={context.torreAscensor} /> : null}
              {confirm.type === 'COTIZACION' ? <ReadOnlyItem label='Número de ruta' value={context.rutaNumero} /> : null}
              <ReadOnlyItem label='Nombre de la persona que solicita' value={context.solicitante} />
            </div>

            <div className='rounded-xl border border-[#F1E4B7] bg-[#FFFBEF] p-3'>
              <p className='text-sm font-semibold text-[#111827]'>Información que completarás en Google Forms</p>
              <ul className='mt-2 space-y-1 text-sm text-[#4B5563]'>
                <li>• Código del elemento</li>
                <li>• Nombre del elemento</li>
                <li>• Cantidad del elemento</li>
              </ul>
            </div>
          </div>

          <div className='mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <Button variant='outline' onClick={() => setConfirm({ open: false, type: null, url: '' })}>Cancelar</Button>
            <Button
              className='bg-[#A11D2E] text-white hover:bg-[#8A1627]'
              disabled={!confirm.type || createMutation.isPending}
              onClick={() => {
                setFormUrlError('');
                if (!confirm.type) {
                  return;
                }

                if (!hallazgoId) {
                  setFormUrlError('Primero guarda el hallazgo para generar la solicitud y registrar su trazabilidad.');
                  return;
                }

                const popup = window.open(confirm.url, '_blank', 'noopener,noreferrer');
                if (!popup) {
                  setFormUrlError('El navegador bloqueó la ventana emergente. Habilita pop-ups para continuar.');
                  return;
                }

                pendingPopupRef.current = popup;
                createMutation.mutate({ type: confirm.type, url: confirm.url });
              }}
            >
              Abrir formulario de Google
            </Button>
          </div>

          {formUrlError ? (
            <p className='mt-2 inline-flex items-center gap-2 text-xs text-[#B42318]'>
              <AlertCircle className='h-3.5 w-3.5' />
              {formUrlError}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type SolicitudBlockProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  infoTitle: string;
  infoText: string;
  buttonLabel: string;
  latest: Solicitud | null;
  actionColor: string;
  disabled: boolean;
  onClick: () => void;
  compact: boolean;
};

function SolicitudBlock({
  title,
  icon: Icon,
  checked,
  onCheckedChange,
  infoTitle,
  infoText,
  buttonLabel,
  latest,
  actionColor,
  disabled,
  onClick,
  compact,
}: SolicitudBlockProps) {
  return (
    <div className='space-y-3 rounded-xl border border-black/10 bg-[#FCFCFD] p-3'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm font-semibold text-[#111827]'>{title}</p>
        <div className='flex items-center gap-2 text-xs'>
          <span className={checked ? 'text-[#A11D2E]' : 'text-[#6B7280]'}>{checked ? 'Sí' : 'No'}</span>
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
      </div>

      {checked ? (
        <div className='space-y-3 rounded-xl border border-[#F4DDE1] bg-[#FDF4F6] p-3'>
          <div className='flex items-start gap-2'>
            <Icon className='mt-0.5 h-4 w-4 text-[#A11D2E]' />
            <div>
              <p className='text-sm font-semibold text-[#111827]'>{infoTitle}</p>
              <p className='text-sm text-[#4B5563]'>{infoText}</p>
            </div>
          </div>

          <Button className={cn('h-10 rounded-xl text-white transition-colors duration-200', actionColor)} disabled={disabled} onClick={onClick}>
            {buttonLabel}
          </Button>
        </div>
      ) : null}

      {latest ? (
        <div className='rounded-xl border border-[#D8F0DF] bg-[#EFFBF3] p-3'>
          <p className='inline-flex items-center gap-2 text-sm font-semibold text-[#166534]'>
            <CircleCheckBig className='h-4 w-4' />
            {String(latest.tipoSolicitud).toUpperCase() === 'COTIZACION' ? 'Cotización generada' : 'Pedido generado'}
          </p>
          <p className='mt-1 text-xs text-[#166534]'>{formatDateTime(latest.fechaCreacion)}</p>
          <a
            href={latest.urlFormulario}
            target='_blank'
            rel='noreferrer'
            className='mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] underline underline-offset-2'
          >
            Ver formulario <ExternalLink className='h-3.5 w-3.5' />
          </a>
        </div>
      ) : null}

      {!compact ? (
        <div className='rounded-xl border border-black/5 bg-white px-3 py-2 text-xs text-[#6B7280]'>
          <p className='inline-flex items-center gap-1.5'>
            <Package className='h-3.5 w-3.5 text-[#A11D2E]' />
            Los campos de código, nombre y cantidad del elemento se diligencian en Google Forms.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReadOnlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-4 rounded-lg border border-black/5 bg-white px-3 py-2'>
      <span className='text-xs font-medium uppercase tracking-wide text-[#6B7280]'>{label}</span>
      <span className='inline-flex items-center gap-1 text-sm font-semibold text-[#111827]'>
        {label.toLowerCase().includes('solicita') ? <UserRound className='h-3.5 w-3.5 text-[#A11D2E]' /> : null}
        {value || '-'}
      </span>
    </div>
  );
}
