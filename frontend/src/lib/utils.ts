import { type ClassValue, clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: Date | string | undefined | null, pattern = "dd 'de' MMMM, yyyy") {
  if (!value) {
    return '-';
  }

  const date =
    typeof value === 'string'
      ? value.includes('T')
        ? new Date(value)
        : new Date(`${value}T12:00:00`)
      : value;

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return format(date, pattern, { locale: es });
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === 'string') {
      return maybe;
    }
  }

  return fallback;
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
