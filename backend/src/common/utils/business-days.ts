import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import Holidays from 'date-holidays';

const SLA_DH_REGEX = /^(\d+)\s*DH$/i;
const BOGOTA_TIMEZONE = 'America/Bogota';
const DEFAULT_HOLIDAYS_COUNTRY = 'CO';
const HOLIDAY_CACHE_PATH = process.env.HOLIDAYS_CACHE_FILE || join(process.cwd(), 'data', 'holidays-cache.json');
const HOLIDAY_PROVIDER_BASE_URL = (process.env.HOLIDAYS_PROVIDER_URL || 'https://date.nager.at/api/v3/PublicHolidays').replace(/\/$/, '');

type HolidayCacheFile = {
  version: 1;
  country: string;
  years: Record<string, string[]>;
  updatedAt: string;
};

type BusinessDayContext = {
  dateIso: string;
  businessDayIndex: number;
  businessDaysInMonth?: number;
  isBusinessDay: boolean;
  monthStartIso: string;
  timezone?: string;
};

const holidayMemoryCache = new Map<string, Set<string>>();
const holidayLoadCache = new Map<string, Promise<Set<string>>>();

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

export async function loadConfiguredHolidaySet(referenceDate: Date = new Date()): Promise<Set<string>> {
  const country = resolveHolidayCountry();
  const year = getBogotaParts(referenceDate).year;
  const cacheKey = `${country}-${year}`;

  const cached = holidayMemoryCache.get(cacheKey);
  if (cached) {
    return new Set(cached);
  }

  const inFlight = holidayLoadCache.get(cacheKey);
  if (inFlight) {
    return new Set(await inFlight);
  }

  const loader = loadHolidaySetForYear(country, year)
    .then((holidays) => {
      holidayMemoryCache.set(cacheKey, new Set(holidays));
      return holidays;
    })
    .finally(() => {
      holidayLoadCache.delete(cacheKey);
    });

  holidayLoadCache.set(cacheKey, loader);
  return new Set(await loader);
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

export function getBusinessDaysForMonth(
  referenceDate: Date = new Date(),
  holidays: Set<string> = new Set<string>(),
): string[] {
  const parts = getBogotaParts(referenceDate);
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0, 12, 0, 0));
  const daysInMonth = lastDay.getUTCDate();
  const businessDays: string[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoDate = `${parts.year}-${pad2(parts.month)}-${pad2(day)}`;
    if (isBogotaBusinessDay(isoDate, holidays)) {
      businessDays.push(isoDate);
    }
  }

  return businessDays;
}

export function getNthBusinessDayOfMonth(
  year: number,
  monthIndex: number,
  nth: number,
  holidays: Set<string> = new Set<string>(),
): string | null {
  if (!Number.isInteger(nth) || nth <= 0) {
    return null;
  }

  let count = 0;
  const cursor = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));

  while (cursor.getUTCMonth() === monthIndex) {
    const isoDate = toIsoDate(cursor);
    if (isBogotaBusinessDay(isoDate, holidays)) {
      count += 1;
      if (count === nth) {
        return isoDate;
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return null;
}

export function isBusinessDay(date: Date, holidays: Set<string> = new Set<string>()): boolean {
  const isoDate = toIsoDate(date);
  if (!isoDate) {
    return false;
  }

  return isBogotaBusinessDay(isoDate, holidays);
}

export function moveToNextBusinessDay(date: Date, holidays: Set<string> = new Set<string>()): Date {
  const shifted = new Date(date);

  while (!isBusinessDay(shifted, holidays)) {
    shifted.setUTCDate(shifted.getUTCDate() + 1);
  }

  return shifted;
}

export function toIsoDate(date: Date): string {
  const parts = getBogotaParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function getBusinessDayContext(
  referenceDate: Date = new Date(),
  holidays: Set<string> = new Set<string>(),
): BusinessDayContext {
  const parts = getBogotaParts(referenceDate);
  const monthStartIso = `${parts.year}-${pad2(parts.month)}-01`;
  const dateIso = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  let businessDayIndex = 0;
  let businessDaysInMonth = 0;

  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0, 12, 0, 0));
  const daysInMonth = lastDay.getUTCDate();

  for (let day = 1; day <= parts.day; day += 1) {
    const iso = `${parts.year}-${pad2(parts.month)}-${pad2(day)}`;
    if (isBogotaBusinessDay(iso, holidays)) {
      businessDayIndex += 1;
    }
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${parts.year}-${pad2(parts.month)}-${pad2(day)}`;
    if (isBogotaBusinessDay(iso, holidays)) {
      businessDaysInMonth += 1;
    }
  }

  const isBusinessDay = isBogotaBusinessDay(dateIso, holidays);

  return {
    dateIso,
    businessDayIndex,
    businessDaysInMonth,
    isBusinessDay,
    monthStartIso,
    timezone: BOGOTA_TIMEZONE,
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
  const [year, month, day] = isoDate.split('-').map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.getUTCDay();
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function resolveHolidayCountry() {
  return (process.env.HOLIDAYS_COUNTRY || DEFAULT_HOLIDAYS_COUNTRY).trim().toUpperCase();
}

async function loadHolidaySetForYear(country: string, year: number): Promise<Set<string>> {
  const cache = await readHolidayCache();
  const cacheKey = `${country}-${year}`;
  const cachedDates = cache.years[String(year)] ?? [];

  if (cachedDates.length) {
    return withManualHolidays(cachedDates);
  }

  try {
    const fetchedDates = await fetchHolidayDates(country, year);
    const holidays = withManualHolidays(fetchedDates);
    await writeHolidayCache({
      version: 1,
      country,
      years: {
        ...cache.years,
        [String(year)]: Array.from(holidays).sort(),
      },
      updatedAt: new Date().toISOString(),
    });

    return holidays;
  } catch {
    const fallbackDates = loadLegacyHolidayDates(country, year);
    if (fallbackDates.size) {
      const holidays = withManualHolidays(Array.from(fallbackDates));
      await writeHolidayCache({
        version: 1,
        country,
        years: {
          ...cache.years,
          [String(year)]: Array.from(holidays).sort(),
        },
        updatedAt: new Date().toISOString(),
      });

      return holidays;
    }

    if (cachedDates.length) {
      return withManualHolidays(cachedDates);
    }

    return withManualHolidays([]);
  }
}

async function fetchHolidayDates(country: string, year: number): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${HOLIDAY_PROVIDER_BASE_URL}/${year}/${country}`, {
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Holiday provider failed with status ${response.status}`);
    }

    const items = (await response.json()) as Array<{ date?: string }>;
    return items
      .map((item) => String(item.date || '').slice(0, 10))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  } finally {
    clearTimeout(timeout);
  }
}

function loadLegacyHolidayDates(country: string, year: number) {
  const holidays = new Set<string>();

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
    // Ignore legacy fallback errors and continue with empty set.
  }

  return holidays;
}

function withManualHolidays(dates: string[]) {
  const holidays = new Set<string>(dates);

  for (const manual of parseHolidaySet(process.env.HOLIDAYS)) {
    holidays.add(manual);
  }

  return holidays;
}

async function readHolidayCache(): Promise<HolidayCacheFile> {
  try {
    const raw = await readFile(HOLIDAY_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<HolidayCacheFile>;

    return {
      version: 1,
      country: String(parsed.country || resolveHolidayCountry()).trim().toUpperCase(),
      years: normalizeHolidayYears(parsed.years),
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return {
      version: 1,
      country: resolveHolidayCountry(),
      years: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

async function writeHolidayCache(cache: HolidayCacheFile) {
  await mkdir(dirname(HOLIDAY_CACHE_PATH), { recursive: true });
  await writeFile(HOLIDAY_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function normalizeHolidayYears(years?: Record<string, string[]>) {
  if (!years || typeof years !== 'object') {
    return {};
  }

  return Object.entries(years).reduce<Record<string, string[]>>((acc, [year, dates]) => {
    acc[year] = Array.from(new Set((dates || []).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))).sort();
    return acc;
  }, {});
}
