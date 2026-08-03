import { PageHeader } from '@/components/page-header';
import { WeeklyReportsPanel } from '@/components/weekly-reports-panel';

export function HallazgosSemanaPage() {
  return (
    <section className='space-y-6'>
      <PageHeader
        title='Hallazgos Semanales'
        description='Vista interactiva, ordenada y clara de los hallazgos reportados en la semana.'
      />

      <WeeklyReportsPanel />
    </section>
  );
}
