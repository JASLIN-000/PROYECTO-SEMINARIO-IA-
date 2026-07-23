import { Badge } from '@/components/ui/badge';

type Props = {
  status?: string | null;
};

export function StatusBadge({ status }: Props) {
  const normalized = String(status ?? '').toUpperCase();

  if (normalized.includes('FINALIZADO') || normalized.includes('SOLUCIONADO')) {
    return <Badge className='bg-[#EAF8EF] text-[#166534]'>{normalized || 'SOLUCIONADO'}</Badge>;
  }

  if (normalized.includes('PROCESO') || normalized.includes('PENDIENTE')) {
    return <Badge className='bg-[#FEF3C7] text-[#92400E]'>PENDIENTE</Badge>;
  }

  if (normalized.includes('ABIERTO')) {
    return <Badge className='bg-[#FDECEC] text-[#A11D2E]'>ABIERTO</Badge>;
  }

  return <Badge className='bg-[#FDECEC] text-[#A11D2E]'>{normalized || 'ABIERTO'}</Badge>;
}
