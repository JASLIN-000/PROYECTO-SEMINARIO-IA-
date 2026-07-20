import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = 'Buscar...' }: Props) {
  return (
    <div className='relative'>
      <Search className='pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400' />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className='pl-9'
      />
    </div>
  );
}
