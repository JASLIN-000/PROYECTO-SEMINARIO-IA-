import { motion } from 'framer-motion';
import { Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { WeeklyReportsPanel } from '@/components/weekly-reports-panel';
import { useInformes } from '@/hooks/use-dashboard';
import { formatDate } from '@/lib/utils';

export function HistorialPage() {
  const navigate = useNavigate();
  const query = useInformes();

  return (
    <section className='space-y-6'>
      <PageHeader
        title='Historial de mantenimientos'
        description='Linea de tiempo de intervenciones realizadas.'
        actions={(
          <Button variant='outline' onClick={() => navigate('/historial/hallazgos-semana')}>
            Ver hoja completa semanal
          </Button>
        )}
      />

      <WeeklyReportsPanel />

      {query.isLoading ? <LoadingSpinner label='Cargando historial...' /> : null}
      {query.isError ? <EmptyState title='No fue posible cargar el historial' description='Intenta nuevamente.' /> : null}

      {!query.isLoading && !query.isError ? (
        <div className='relative space-y-4 before:absolute before:left-[15px] before:top-0 before:h-full before:w-px before:bg-wine-200'>
          {query.data?.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className='relative pl-10'
            >
              <span className='absolute left-0 top-6 grid h-8 w-8 place-items-center rounded-full bg-wine-100 text-wine-800'>
                <Clock3 className='h-4 w-4' />
              </span>

              <Card>
                <CardContent className='space-y-2 p-4'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h3 className='font-display text-base font-semibold text-wine-900'>{item.nombreEquipo ?? item.idEquipo}</h3>
                    <StatusBadge status={item.estado} />
                  </div>
                  <p className='text-sm text-slate-500'>{formatDate(item.fechaGeneracion, "dd 'de' MMMM yyyy HH:mm")}</p>
                  <p className='text-sm text-slate-600'>
                    <strong>Tipo de mantenimiento:</strong> {item.modulos.join(', ')}
                  </p>
                  <p className='text-sm text-slate-600'>
                    <strong>Descripcion:</strong> {item.observaciones}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
