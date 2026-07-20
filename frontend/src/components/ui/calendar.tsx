import { es } from 'date-fns/locale';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { cn } from '@/lib/utils';

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn('p-0', className)}
      classNames={{
        months: 'flex flex-col gap-3',
        month: 'space-y-4 w-full',
        month_caption: 'flex items-center justify-between pt-1 relative',
        caption_label: 'text-base font-semibold leading-6 text-[#111827] capitalize',
        nav: 'flex items-center gap-2',
        nav_button: 'grid h-9 w-9 place-items-center rounded-2xl border border-black/5 bg-[#F5F5F5] text-[#6B7280] transition-colors duration-200 hover:bg-[#FDF2F2] hover:text-[#8E0000]',
        table: 'w-full border-collapse',
        head_row: 'grid grid-cols-7 gap-0',
        head_cell: 'h-10 text-center text-[0.72rem] font-semibold uppercase leading-6 tracking-[0.12em] text-[#6B7280]',
        row: 'grid grid-cols-7 gap-0',
        cell: 'relative flex h-11 w-full items-center justify-center p-0 text-center text-sm',
        day: 'h-10 w-10 rounded-2xl p-0 font-medium text-[#111827] transition-colors duration-200 hover:bg-[#F5F5F5]',
        day_selected: 'bg-[#C62828] text-white hover:bg-[#B71C1C]',
        day_today: 'border border-[#C62828]/25 bg-[#FDF2F2] text-[#8E0000]',
        day_outside: 'text-[#C9CDD4]',
        day_disabled: 'text-[#C9CDD4] opacity-50',
        ...classNames,
      } as DayPickerProps['classNames']}
      {...props}
    />
  );
}
