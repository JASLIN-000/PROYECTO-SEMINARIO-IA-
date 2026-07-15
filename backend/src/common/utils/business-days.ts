// eslint-disable-next-line @typescript-eslint/no-var-requires
const Holidays = require('date-holidays');

const SLA_DH_REGEX = /^(\d+)\s*DH$/i;
const DEFAULT_HOLIDAY_COUNTRY = 'CO';
const DEFAULT_TIME_ZONE = 'America/Bogota';

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export interface BusinessDayContext {
  dateIso: string;
  businessDayIndex: number;
  isBusinessDay: boolean;
  monthStartIso: string;
}

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

export function getConfiguredHolidaySet(): Set<string> {
  return parseHolidaySet(process.env.HOLIDAYS);
}

export function getConfiguredHolidayCountry(): string {
  return (process.env.HOLIDAYS_COUNTRY || DEFAULT_HOLIDAY_COUNTRY).trim().toUpperCase();
}

function addDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function getBogotaDateParts(date: Date) {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIME_ZONE,
    weekday: 'short',
  });

  const dateParts = dateFormatter.formatToParts(date);
  const year = Number(dateParts.find((item) => item.type === 'year')?.value ?? '0');
  const month = Number(dateParts.find((item) => item.type === 'month')?.value ?? '0');
  const day = Number(dateParts.find((item) => item.type === 'day')?.value ?? '0');
  const weekday = (weekdayFormatter.format(date) || '').slice(0, 3).toLowerCase();

  return {
    year,
    month,
    day,
    weekdayIndex: WEEKDAY_TO_INDEX[weekday] ?? 0,
    isoDate: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function toBogotaMidnight(date: Date): Date {
  const parts = getBogotaDateParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 5, 0, 0, 0));
}

function isCountryHoliday(date: Date, countryCode: string = getConfiguredHolidayCountry()): boolean {
  const calendar = new Holidays(countryCode);
  return Boolean(calendar.isHoliday(toBogotaMidnight(date)));
}

export function isBusinessDay(date: Date, holidays: Set<string> = new Set<string>()): boolean {
  const parts = getBogotaDateParts(date);
  const isWeekend = parts.weekdayIndex === 0 || parts.weekdayIndex === 6;

  if (isWeekend) {
    return false;
  }

  const isoDate = parts.isoDate;
  return !holidays.has(isoDate) && !isCountryHoliday(date);
}

export function moveToNextBusinessDay(date: Date, holidays: Set<string> = new Set<string>()): Date {
  let shifted = toBogotaMidnight(date);

  while (!isBusinessDay(shifted, holidays)) {
    shifted = addDays(shifted, 1);
  }

  return shifted;
}

export function toIsoDate(date: Date): string {
  return getBogotaDateParts(date).isoDate;
}

export function getBusinessDayIndexOfMonth(date: Date, holidays: Set<string> = new Set<string>()): number {
  if (!isBusinessDay(date, holidays)) {
    return 0;
  }

  const parts = getBogotaDateParts(date);
  let current = new Date(Date.UTC(parts.year, parts.month - 1, 1, 5, 0, 0, 0));
  const targetIso = parts.isoDate;
  let businessDayIndex = 0;

  while (toIsoDate(current) <= targetIso) {
    if (isBusinessDay(current, holidays)) {
      businessDayIndex += 1;
    }

    current = addDays(current, 1);
  }

  return businessDayIndex;
}

export function getBusinessDayContext(date: Date, holidays: Set<string> = new Set<string>()): BusinessDayContext {
  const parts = getBogotaDateParts(date);
  const monthStart = new Date(Date.UTC(parts.year, parts.month - 1, 1, 5, 0, 0, 0));

  return {
    dateIso: toIsoDate(date),
    businessDayIndex: getBusinessDayIndexOfMonth(date, holidays),
    isBusinessDay: isBusinessDay(date, holidays),
    monthStartIso: toIsoDate(monthStart),
  };
}
