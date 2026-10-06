import type { PeriodFilterValue } from '../components/period-filter/PeriodFilter';

export const DEFAULT_BUSINESS_TIMEZONE = 'America/Mexico_City';

interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

interface CalendarDateTimeParts extends CalendarDateParts {
  hour: number;
  minute: number;
  second: number;
  millisecond?: number;
}

export function normalizeBusinessTimeZone(
  timeZone?: string | null,
): string {
  const candidate =
    timeZone?.trim() ||
    DEFAULT_BUSINESS_TIMEZONE;

  try {
    new Intl.DateTimeFormat(
      'en-US',
      { timeZone: candidate },
    ).format(new Date());

    return candidate;
  } catch {
    return DEFAULT_BUSINESS_TIMEZONE;
  }
}

function partsFromFormatter(
  date: Date,
  timeZone: string,
): CalendarDateTimeParts {
  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      },
    );

  const values =
    Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value]),
    );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: date.getUTCMilliseconds(),
  };
}

export function getBusinessCalendarDate(
  date: Date,
  timeZone?: string | null,
): CalendarDateParts {
  const zone =
    normalizeBusinessTimeZone(timeZone);

  const parts =
    partsFromFormatter(date, zone);

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function getPickerCalendarDate(
  date: Date,
): CalendarDateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function addCalendarDays(
  date: CalendarDateParts,
  days: number,
): CalendarDateParts {
  const utc =
    new Date(
      Date.UTC(
        date.year,
        date.month - 1,
        date.day + days,
      ),
    );

  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function getTimeZoneOffsetMs(
  date: Date,
  timeZone: string,
): number {
  const parts =
    partsFromFormatter(date, timeZone);

  const asUtc =
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond ?? 0,
    );

  return asUtc - date.getTime();
}

export function businessLocalDateTimeToUtc(
  parts: CalendarDateTimeParts,
  timeZone?: string | null,
): Date {
  const zone =
    normalizeBusinessTimeZone(timeZone);

  const targetUtc =
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond ?? 0,
    );

  let guess =
    new Date(targetUtc);

  for (let index = 0; index < 3; index += 1) {
    const offset =
      getTimeZoneOffsetMs(
        guess,
        zone,
      );

    const corrected =
      new Date(
        targetUtc - offset,
      );

    if (
      corrected.getTime() ===
      guess.getTime()
    ) {
      break;
    }

    guess = corrected;
  }

  return guess;
}

export function startOfBusinessCalendarDay(
  date: CalendarDateParts,
  timeZone?: string | null,
): Date {
  return businessLocalDateTimeToUtc(
    {
      ...date,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    timeZone,
  );
}

export function endOfBusinessCalendarDay(
  date: CalendarDateParts,
  timeZone?: string | null,
): Date {
  const nextDay =
    addCalendarDays(date, 1);

  return new Date(
    startOfBusinessCalendarDay(
      nextDay,
      timeZone,
    ).getTime() - 1,
  );
}

export function startOfBusinessDay(
  instant: Date,
  timeZone?: string | null,
): Date {
  return startOfBusinessCalendarDay(
    getBusinessCalendarDate(
      instant,
      timeZone,
    ),
    timeZone,
  );
}

export function endOfBusinessDay(
  instant: Date,
  timeZone?: string | null,
): Date {
  return endOfBusinessCalendarDay(
    getBusinessCalendarDate(
      instant,
      timeZone,
    ),
    timeZone,
  );
}

export function startOfBusinessPickerDay(
  pickerDate: Date,
  timeZone?: string | null,
): Date {
  return startOfBusinessCalendarDay(
    getPickerCalendarDate(pickerDate),
    timeZone,
  );
}

export function endOfBusinessPickerDay(
  pickerDate: Date,
  timeZone?: string | null,
): Date {
  return endOfBusinessCalendarDay(
    getPickerCalendarDate(pickerDate),
    timeZone,
  );
}

export function getBusinessPeriodRange(
  period: PeriodFilterValue,
  customStart: Date,
  customEnd: Date,
  timeZone?: string | null,
  allStartYear = 2000,
): { from: Date; to: Date } {
  const zone =
    normalizeBusinessTimeZone(timeZone);

  const now =
    new Date();

  const today =
    getBusinessCalendarDate(
      now,
      zone,
    );

  if (period === 'custom') {
    return {
      from:
        startOfBusinessPickerDay(
          customStart,
          zone,
        ),
      to:
        endOfBusinessPickerDay(
          customEnd,
          zone,
        ),
    };
  }

  if (period === 'all') {
    return {
      from:
        startOfBusinessCalendarDay(
          {
            year: allStartYear,
            month: 1,
            day: 1,
          },
          zone,
        ),
      to:
        endOfBusinessCalendarDay(
          today,
          zone,
        ),
    };
  }

  if (period === 'month') {
    return {
      from:
        startOfBusinessCalendarDay(
          {
            year: today.year,
            month: today.month,
            day: 1,
          },
          zone,
        ),
      to:
        endOfBusinessCalendarDay(
          today,
          zone,
        ),
    };
  }

  if (period === '7days') {
    return {
      from:
        startOfBusinessCalendarDay(
          addCalendarDays(
            today,
            -6,
          ),
          zone,
        ),
      to:
        endOfBusinessCalendarDay(
          today,
          zone,
        ),
    };
  }

  return {
    from:
      startOfBusinessCalendarDay(
        today,
        zone,
      ),
    to:
      endOfBusinessCalendarDay(
        today,
        zone,
      ),
  };
}

export function getBusinessReportRange(
  filter:
    | 'today'
    | 'week'
    | 'month'
    | 'year'
    | 'custom',
  customStart: Date,
  customEnd: Date,
  timeZone?: string | null,
): { from: Date; to: Date } {
  const zone =
    normalizeBusinessTimeZone(timeZone);

  const now =
    new Date();

  const today =
    getBusinessCalendarDate(
      now,
      zone,
    );

  if (filter === 'custom') {
    return {
      from:
        startOfBusinessPickerDay(
          customStart,
          zone,
        ),
      to:
        endOfBusinessPickerDay(
          customEnd,
          zone,
        ),
    };
  }

  let fromDate = today;

  if (filter === 'week') {
    fromDate =
      addCalendarDays(
        today,
        -6,
      );
  } else if (filter === 'month') {
    fromDate = {
      year: today.year,
      month: today.month,
      day: 1,
    };
  } else if (filter === 'year') {
    fromDate = {
      year: today.year,
      month: 1,
      day: 1,
    };
  }

  return {
    from:
      startOfBusinessCalendarDay(
        fromDate,
        zone,
      ),
    to:
      endOfBusinessCalendarDay(
        today,
        zone,
      ),
  };
}

export function formatBusinessDate(
  value: Date | string,
  timeZone?: string | null,
): string {
  const date =
    typeof value === 'string'
      ? new Date(value)
      : value;

  return date.toLocaleDateString(
    'es-MX',
    {
      timeZone:
        normalizeBusinessTimeZone(
          timeZone,
        ),
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  );
}

export function formatBusinessDateTime(
  value: Date | string,
  timeZone?: string | null,
): string {
  const date =
    typeof value === 'string'
      ? new Date(value)
      : value;

  return date.toLocaleString(
    'es-MX',
    {
      timeZone:
        normalizeBusinessTimeZone(
          timeZone,
        ),
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

export function formatPickerDate(
  date: Date,
): string {
  const parts =
    getPickerCalendarDate(date);

  return [
    String(parts.day).padStart(2, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.year),
  ].join('/');
}

export function pickerDateTimeToBusinessUtc(
  pickerDate: Date,
  timeZone?: string | null,
): Date {
  return businessLocalDateTimeToUtc(
    {
      year: pickerDate.getFullYear(),
      month: pickerDate.getMonth() + 1,
      day: pickerDate.getDate(),
      hour: pickerDate.getHours(),
      minute: pickerDate.getMinutes(),
      second: pickerDate.getSeconds(),
      millisecond: pickerDate.getMilliseconds(),
    },
    timeZone,
  );
}

export function businessInstantToPickerDate(
  value: Date | string,
  timeZone?: string | null,
): Date {
  const instant =
    typeof value === 'string'
      ? new Date(value)
      : value;

  const parts =
    partsFromFormatter(
      instant,
      normalizeBusinessTimeZone(timeZone),
    );

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond ?? 0,
  );
}
