import { Bell, MoonStar, ShieldUser, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

const blocks = [
  {
    title: 'Perfil',
    description: 'Gestion de informacion del tecnico y datos de sesion.',
    icon: ShieldUser,
  },
  {
    title: 'Notificaciones',
    description: 'Preferencias para alertas de mantenimientos y hallazgos.',
    icon: Bell,
  },
  {
    title: 'Tema',
    description: 'Opciones de apariencia y contraste para la interfaz.',
    icon: MoonStar,
  },
  {
    title: 'Informacion del sistema',
    description: 'Version del cliente y estado de conectividad con API.',
    icon: Wrench,
  },
];

export function ConfiguracionPage() {
  return (
    <section className='space-y-6'>
      <PageHeader title='Configuracion' description='Estructura inicial de opciones del sistema.' />

      <div className='grid gap-4 md:grid-cols-2'>
        {blocks.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className='flex-row items-center gap-3 space-y-0'>
                <div className='grid h-10 w-10 place-items-center rounded-xl bg-wine-100'>
                  <Icon className='h-5 w-5 text-wine-700' />
                </div>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className='text-sm text-slate-500'>{item.description}</CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
