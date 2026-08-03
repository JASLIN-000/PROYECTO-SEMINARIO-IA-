import { CalendarDays, Sparkles } from 'lucide-react';
import type { DayPickerProps } from 'react-day-picker';
import type { BackendCalendarContext } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { toIsoDate } from '@/utils/business-days';

type Props = {
  date: Date;
  onDateChange: (date: Date | undefined) => void;
  calendarContext?: BackendCalendarContext;
  hasEquiposForSelectedDate?: boolean;
};

export function CalendarCard({ date, onDateChange, calendarContext, hasEquiposForSelectedDate = false }: Props) {
  const calendarIsoDate = calendarContext?.isoDate ?? calendarContext?.dateIso ?? calendarContext?.date;
  const operationalSaturdayWeeks = calendarContext?.operationalSaturdayWeeks ?? [];
  const isSaturdaySelected = date.getDay() === 6;
  const getSaturdayIndexInMonth = (candidate: Date) => {
    const day = candidate.getDate();
    const month = candidate.getMonth();
    const year = candidate.getFullYear();
    let count = 0;

    for (let d = 1; d <= day; d += 1) {
      const cursor = new Date(year, month, d);
      if (cursor.getDay() === 6) {
        count += 1;
      }
    }

    return count;
  };
  const selectedSaturdayIndex = isSaturdaySelected ? getSaturdayIndexInMonth(date) : null;
  const isOperationalSaturdayByMonth = Boolean(
    selectedSaturdayIndex && operationalSaturdayWeeks.includes(selectedSaturdayIndex),
  );
  const isOperationalDay = Boolean(
    calendarContext?.isBusinessDay
    || calendarContext?.isOperationalDay
    || (isSaturdaySelected && (hasEquiposForSelectedDate || isOperationalSaturdayByMonth)),
  );
  const currentBusinessDate = isOperationalDay
    && calendarIsoDate
    ? new Date(`${calendarIsoDate}T12:00:00`)
    : undefined;
  const selectedDateIso = toIsoDate(date);
  const currentOperationalIso = calendarIsoDate ?? '';
  const isOperationalSelectedDate = isOperationalDay && currentOperationalIso === selectedDateIso;

  return (
    <Card className='flex h-full flex-col rounded-2xl'>
      <CardHeader className='space-y-4 p-4 sm:p-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <CardTitle>Calendario de programacion</CardTitle>
            <p className='mt-1 text-sm text-[#6B7280]'>Selecciona una fecha para recalcular automaticamente la programacion diaria.</p>
          </div>
          <Badge variant='neutral' className='w-fit gap-1 self-start rounded-full px-3 py-1.5'>
            <CalendarDays className='h-3.5 w-3.5' />
            {calendarContext?.isBusinessDay
              ? `DH ${calendarContext.businessDayIndex}`
              : calendarContext?.isOperationalDay
                ? (calendarContext.operationalLabel || 'Operativo')
                : (isSaturdaySelected && (hasEquiposForSelectedDate || isOperationalSaturdayByMonth)
                    ? 'Sabado operativo'
                    : 'No habil')}
          </Badge>
        </div>
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-black/5 bg-[#F5F5F5] p-4'>
          <div className='mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold leading-5 text-[#8E0000]'>
            <Sparkles className='h-4 w-4' />
            Fecha seleccionada: {formatDate(date)}
          </div>
          <Calendar
            mode='single'
            selected={date}
            onSelect={onDateChange}
            className='mx-auto w-full max-w-[294px] sm:max-w-[308px]'
            classNames={{
              caption_label: 'text-[15px] font-semibold leading-5 text-[#111827]',
              head_cell: 'text-center text-[0.72rem] font-semibold uppercase leading-5 tracking-[0.08em] text-[#6B7280]',
              cell: 'h-10 w-10 p-0 text-center text-sm',
              day: 'h-9 w-9 rounded-xl p-0 text-[0.9rem] font-medium leading-9 text-[#111827] transition-colors duration-200 hover:bg-[#FFFFFF]',
            } as DayPickerProps['classNames']}
            modifiers={{
              weekend: (candidate) => {
                const isSunday = candidate.getDay() === 0;
                const isSaturday = candidate.getDay() === 6;
                if (!isSaturday) {
                  return isSunday;
                }

                const saturdayIndex = getSaturdayIndexInMonth(candidate);
                const saturdayIsOperational = operationalSaturdayWeeks.includes(saturdayIndex)
                  || (isOperationalSelectedDate && toIsoDate(candidate) === selectedDateIso);

                return !saturdayIsOperational;
              },
              operationalSaturday: (candidate) => {
                if (candidate.getDay() !== 6) {
                  return false;
                }

                const saturdayIndex = getSaturdayIndexInMonth(candidate);
                return operationalSaturdayWeeks.includes(saturdayIndex)
                  || (isOperationalSelectedDate && toIsoDate(candidate) === selectedDateIso);
              },
              currentBusinessDay: (candidate) => Boolean(currentBusinessDate) && candidate.toDateString() === currentBusinessDate?.toDateString(),
            }}
            modifiersClassNames={{
              weekend: 'text-[#B6BBC4] hover:bg-[#F5F5F5] hover:text-[#B6BBC4]',
              operationalSaturday: '!text-[#111827] hover:!text-[#111827]',
              currentBusinessDay: 'border border-[#C62828]/20 bg-[#FDF2F2] text-[#8E0000] font-semibold',
            }}
          />
        </div>
      </CardHeader>
    </Card>
  );
}
