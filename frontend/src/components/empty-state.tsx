import { CalendarX2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <Card className='border-dashed'>
      <CardHeader className='items-center text-center'>
        <div className='grid h-16 w-16 place-items-center rounded-2xl bg-wine-50'>
          <CalendarX2 className='h-8 w-8 text-wine-700' />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className='text-center text-sm text-slate-500'>{description}</CardContent>
    </Card>
  );
}
