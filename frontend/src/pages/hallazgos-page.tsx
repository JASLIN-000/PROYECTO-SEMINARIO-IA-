import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useHallazgos } from '@/hooks/use-dashboard';
import { formatDate } from '@/lib/utils';
import type { Hallazgo } from '@/types/domain';

export function HallazgosPage() {
  const [estado, setEstado] = useState('');
  const [equipo, setEquipo] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [selected, setSelected] = useState<Hallazgo | null>(null);

  const query = useHallazgos({
    estado: estado || undefined,
    equipoId: equipo || undefined,
    nombreEquipo: nombreEquipo || undefined,
  });

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
        cell: ({ row }) => <StatusBadge status={row.original.estado} />,
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
    [],
  );

  return (
    <section className='space-y-6'>
      <PageHeader title='Hallazgos' description='Consulta y revisa los ultimos hallazgos registrados.' />

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
              <DialogHeader>
                <DialogTitle>Hallazgo #{selected.id}</DialogTitle>
                <DialogDescription>{selected.nombreEquipo ?? selected.idEquipo ?? 'Equipo sin nombre'}</DialogDescription>
              </DialogHeader>

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
    </section>
  );
}
