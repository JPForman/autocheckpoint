const WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ZonedSlotParts = {
  /** YYYY-MM-DD in `timeZone` */
  calendarKey: string;
  dayOfWeek: number;
  minuteOfDay: number;
};

/**
 * Calendar day + clock in an IANA timezone (for matching stored availability windows).
 */
export function getZonedSlotParts(date: Date, timeZone: string): ZonedSlotParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPart['type']) =>
    parts.find((p) => p.type === type)?.value;

  const weekday = pick('weekday');
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  const hour = pick('hour');
  const minute = pick('minute');

  if (!weekday || !year || !month || !day || hour === undefined || minute === undefined) {
    throw new Error('Failed to resolve zoned date parts');
  }

  const dayOfWeek = WEEKDAY_TO_DOW[weekday];
  if (dayOfWeek === undefined) {
    throw new Error(`Unexpected weekday label: ${weekday}`);
  }

  return {
    calendarKey: `${year}-${month}-${day}`,
    dayOfWeek,
    minuteOfDay: Number(hour) * 60 + Number(minute),
  };
}

export function isValidIanaTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
