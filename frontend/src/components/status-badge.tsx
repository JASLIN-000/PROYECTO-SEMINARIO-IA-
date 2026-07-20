import { Badge } from '@/components/ui/badge';

type Props = {
  status?: string | null;
};

export function StatusBadge({ status }: Props) {
  const normalized = String(status ?? '').toUpperCase();

  if (normalized.includes('FINALIZADO') || normalized.includes('SOLUCIONADO')) {
    return <Badge variant='success'>{normalized || 'FINALIZADO'}</Badge>;
  }

  if (normalized.includes('PROCESO') || normalized.includes('PENDIENTE')) {
    return <Badge variant='warning'>{normalized || 'PENDIENTE'}</Badge>;
  }

  return <Badge variant='default'>{normalized || 'ABIERTO'}</Badge>;
}
