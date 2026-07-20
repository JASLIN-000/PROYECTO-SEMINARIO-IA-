import { motion } from 'framer-motion';
import { Building2, Clock3, FileText, History, MapPin, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Equipo } from '@/types/domain';

type Props = {
  equipo: Equipo;
  onViewHistory?: (equipo: Equipo) => void;
  onGenerateReport?: (equipo: Equipo) => void;
};

export function EquipmentCard({ equipo, onViewHistory, onGenerateReport }: Props) {
  const status = getEquipmentStatus(equipo.estado);

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      <Card className='overflow-hidden rounded-2xl'>
        <CardContent className='p-4'>
          <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <div className='flex min-w-0 items-start gap-3'>
              <div className='grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#FDF2F2] text-[#8E0000]'>
                <Building2 className='h-4.5 w-4.5' />
              </div>

              <div className='min-w-0 space-y-3'>
                <div className='space-y-1'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]'>{equipo.idEquipo}</p>
                  <h3 className='truncate font-display text-[15px] font-semibold text-[#111827]'>{equipo.nombreEquipo}</h3>
                </div>

                <div className='grid gap-x-4 gap-y-2 text-sm text-[#6B7280] lg:grid-cols-2 2xl:grid-cols-3'>
                  <div className='flex items-center gap-2'>
                    <MapPin className='h-4 w-4 text-[#8E0000]' />
                    <span className='truncate'>{equipo.ubicacion ?? `Ruta ${equipo.rutaNumero ?? '-'}`}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Wrench className='h-4 w-4 text-[#8E0000]' />
                    <span>{equipo.tipoMantenimiento ?? 'Preventivo'}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Clock3 className='h-4 w-4 text-[#8E0000]' />
                    <span>{equipo.horaProgramada ?? '08:00 - 12:00'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-col items-stretch gap-2 xl:min-w-[300px] xl:items-end'>
              <div className='flex items-center justify-between gap-3 xl:w-full xl:justify-end'>
                <Badge variant={status.variant} className='px-3 py-1.5 text-[11px] uppercase tracking-[0.12em]'>
                  {status.label}
                </Badge>
                <span className='rounded-full bg-[#F5F5F5] px-3 py-1.5 text-xs font-semibold text-[#6B7280]'>
                  {equipo.acuerdoNivelServicioDh} DH
                </span>
              </div>
              <div className='flex flex-col gap-2 sm:flex-row xl:justify-end'>
                <Button variant='outline' size='sm' className='h-9' onClick={() => onViewHistory?.(equipo)}>
                  <History className='mr-2 h-4 w-4' /> Ver historial
                </Button>
                <Button size='sm' className='h-9' onClick={() => onGenerateReport?.(equipo)}>
                  <FileText className='mr-2 h-4 w-4' /> Generar informe
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getEquipmentStatus(rawStatus?: string | null) {
  const normalized = String(rawStatus ?? '').trim().toUpperCase();

  if (normalized.includes('MANTEN')) {
    return { label: 'En mantenimiento', variant: 'warning' as const };
  }

  if (normalized.includes('FUERA') || normalized.includes('INACT') || normalized.includes('SUSP')) {
    return { label: 'Fuera de servicio', variant: 'neutral' as const };
  }

  return { label: 'Operativo', variant: 'default' as const };
}
