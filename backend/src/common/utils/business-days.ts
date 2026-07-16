import Holidays from 'date-holidays';

const SLA_DH_REGEX = /^(\d+)\s*DH$/i;
const BOGOTA_TIMEZONE = 'America/Bogota';

type BusinessDayContext = {
  dateIso: string;
  businessDayIndex: number;
  isBusinessDay: boolean;
  monthStartIso: string;
};

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

export function getConfiguredHolidaySet(referenceDate: Date = new Date()): Set<string> {
  const country = (process.env.HOLIDAYS_COUNTRY || 'CO').trim().toUpperCase();
  const holidays = new Set<string>();
  const year = getBogotaParts(referenceDate).year;

  try {
    const provider = new Holidays(country);
    const items = provider.getHolidays(year);

    for (const item of items) {
      const date = typeof item.date === 'string' ? item.date.slice(0, 10) : '';
      if (date) {
        holidays.add(date);
      }
    }
  } catch {
    // Keep empty set when country calendar cannot be loaded.
  }

  for (const manual of parseHolidaySet(process.env.HOLIDAYS)) {
    holidays.add(manual);
  }

  return holidays;
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

export function getBusinessDayContext(
  referenceDate: Date = new Date(),
  holidays: Set<string> = new Set<string>(),
): BusinessDayContext {
  const parts = getBogotaParts(referenceDate);
  const monthStartIso = `${parts.year}-${pad2(parts.month)}-01`;
  const dateIso = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  let businessDayIndex = 0;

  for (let day = 1; day <= parts.day; day += 1) {
    const iso = `${parts.year}-${pad2(parts.month)}-${pad2(day)}`;
    if (isBogotaBusinessDay(iso, holidays)) {
      businessDayIndex += 1;
    }
  }

  const isBusinessDay = isBogotaBusinessDay(dateIso, holidays);

  return {
    dateIso,
    businessDayIndex,
    isBusinessDay,
    monthStartIso,
  };
}

function getBogotaParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function isBogotaBusinessDay(isoDate: string, holidays: Set<string>) {
  if (holidays.has(isoDate)) {
    return false;
  }

  const weekday = getWeekdayFromIso(isoDate);
  return weekday !== 0 && weekday !== 6;
}

function getWeekdayFromIso(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00-05:00`);
  return date.getUTCDay();
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}
