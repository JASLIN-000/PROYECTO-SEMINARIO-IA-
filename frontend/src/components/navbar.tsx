import { Bell, CalendarDays, Menu, Sparkles, UserCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/auth-context';
import { formatDate } from '@/lib/utils';
import { useEquiposProgramados } from '@/hooks/use-dashboard';
import { toIsoDate } from '@/utils/business-days';

type Props = {
  onOpenMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
};

export function Navbar({ onOpenMobileSidebar, onToggleDesktopSidebar }: Props) {
  const { user } = useAuth();
  const todayQuery = useEquiposProgramados(toIsoDate(new Date()));
  const businessDayIndex = todayQuery.data?.calendario.businessDayIndex;
  const businessDayLabel = todayQuery.data?.calendario.isBusinessDay
    ? `DH ${businessDayIndex}`
    : 'Sin dia habil';
  const initials = user?.nombre
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <TooltipProvider delayDuration={150}>
      <header className='sticky top-0 z-20 rounded-[28px] border border-black/5 bg-white px-4 py-3 shadow-soft'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <Button variant='outline' size='icon' className='lg:hidden' onClick={onOpenMobileSidebar}>
              <Menu className='h-4 w-4' />
            </Button>
            <Button variant='outline' size='icon' className='hidden lg:inline-flex' onClick={onToggleDesktopSidebar}>
              <Menu className='h-4 w-4' />
            </Button>
            <div>
              <p className='font-display text-base font-semibold text-[#111827]'>{user?.nombre ?? 'Tecnico de mantenimiento'}</p>
              <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]'>
                <span>Tecnico de mantenimiento</span>
                <span className='h-1 w-1 rounded-full bg-[#D1D5DB]' />
                <span className='flex items-center gap-1'>
                  <CalendarDays className='h-3.5 w-3.5' />
                  {formatDate(new Date(), "dd 'de' MMMM, yyyy")}
                </span>
                <span className='h-1 w-1 rounded-full bg-[#D1D5DB]' />
                <span className='inline-flex items-center gap-1 rounded-full bg-[#FDF2F2] px-2.5 py-1 font-semibold text-[#8E0000]'>
                  <Sparkles className='h-3.5 w-3.5' />
                  {businessDayLabel}
                </span>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' className='relative rounded-2xl'>
                  <Bell className='h-4 w-4 text-[#8E0000]' />
                  <span className='absolute right-2 top-2 h-2 w-2 rounded-full bg-[#C62828]' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notificaciones del tecnico</TooltipContent>
            </Tooltip>
            <div className='hidden text-right sm:block'>
              <p className='text-sm font-semibold text-[#111827]'>Ruta {user?.rutaNumero ?? '-'}</p>
              <p className='text-xs text-[#6B7280]'>Sesion activa</p>
            </div>
            <Avatar className='h-10 w-10 border border-black/5 bg-[#F5F5F5]'>
              <AvatarFallback className='bg-[#FDF2F2] font-semibold text-[#8E0000]'>
                {initials || <UserCircle2 className='h-5 w-5' />}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
