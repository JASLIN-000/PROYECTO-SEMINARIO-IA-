import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div>
        <h1 className='font-display text-2xl font-semibold text-wine-900 md:text-3xl'>{title}</h1>
        {description ? <p className='mt-1 text-sm text-slate-500'>{description}</p> : null}
      </div>
      {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
    </div>
  );
}
