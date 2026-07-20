import { motion } from 'framer-motion';
import {
  Clock3,
  Home,
  LogOut,
  Search,
  FileText,
  Settings,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/buscar-equipos', label: 'Buscar Equipos', icon: Search },
  { to: '/hallazgos', label: 'Hallazgos', icon: TriangleAlert },
  { to: '/informes', label: 'Informes', icon: FileText },
  { to: '/historial', label: 'Historial', icon: Clock3 },
  { to: '/configuracion', label: 'Configuracion', icon: Settings },
];

type Props = {
  collapsed: boolean;
  mobile?: boolean;
};

export function Sidebar({ collapsed, mobile = false }: Props) {
  const { logout } = useAuth();

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 240 }}
      className={cn(
        'overflow-hidden border-black/5 bg-white px-3 py-4',
        mobile ? 'relative block h-full w-full border-r' : 'fixed inset-y-0 left-0 z-30 hidden border-r lg:block',
      )}
    >
      <div className='mb-6 flex items-center gap-3 rounded-3xl border border-black/5 bg-[#FDF2F2] p-2.5'>
        <div className='grid h-10 w-10 place-items-center rounded-2xl bg-[#C62828] text-white shadow-soft'>
          <ShieldCheck className='h-5 w-5' />
        </div>
        {!collapsed || mobile ? (
          <div>
            <p className='font-display text-base font-semibold text-[#111827]'>TrazaDH</p>
            <p className='text-xs text-[#6B7280]'>Gestion de mantenimiento</p>
          </div>
        ) : null}
      </div>

      <nav className='space-y-1.5'>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#C62828] text-white shadow-soft'
                    : 'text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#8E0000]',
                )
              }
            >
              <Icon className='h-4 w-4' />
              {!collapsed || mobile ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className='absolute inset-x-3 bottom-4'>
        <Button
          variant='outline'
          className='h-10 w-full justify-start border-[#C62828]/20 text-[#C62828]'
          onClick={logout}
        >
          <LogOut className='mr-2 h-4 w-4' /> {!collapsed || mobile ? 'Cerrar sesion' : ''}
        </Button>
      </div>
    </motion.aside>
  );
}
