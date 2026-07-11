const SLA_DH_REGEX = /^(\d+)\s*DH$/i;

export function parseSlaBusinessDays(acuerdoNivelServicio?: string): number {
  if (!acuerdoNivelServicio) {
    return 0;
  }

  const value = acuerdoNivelServicio.trim();
  const match = SLA_DH_REGEX.exec(value);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

export function slaBusinessDaysToHours(acuerdoNivelServicio?: string): number {
  return parseSlaBusinessDays(acuerdoNivelServicio) * 24;
}

export function parseHolidaySet(rawHolidays?: string): Set<string> {
  if (!rawHolidays?.trim()) {
    return new Set<string>();
  }

  const dates = rawHolidays
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return new Set<string>(dates);
}

export function isBusinessDay(date: Date, holidays: Set<string> = new Set<string>()): boolean {
  const day = date.getUTCDay();
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    return false;
  }

  const isoDate = toIsoDate(date);
  return !holidays.has(isoDate);
}

export function moveToNextBusinessDay(date: Date, holidays: Set<string> = new Set<string>()): Date {
  const shifted = new Date(date);

  while (!isBusinessDay(shifted, holidays)) {
    shifted.setUTCDate(shifted.getUTCDate() + 1);
  }

  return shifted;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
