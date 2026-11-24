import type { StatusKind } from '@openjcockpit/ui';

/** Run status as the server sends it (an open string) mapped to a chip kind. */
export function runStatusKind(status: string): StatusKind {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'done';
    case 'FAILED':
      return 'error';
    case 'RUNNING':
      return 'active';
    case 'WAITING':
    case 'WAITING_FOR_APPROVAL':
      return 'waiting';
    default:
      return 'neutral';
  }
}

/** Whole minutes between two instants; null when either is missing or unparseable. */
export function durationMinutes(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isNaN(ms) || ms < 0 ? null : Math.round(ms / 60_000);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "5 minutes ago" in the given locale; falls back to the raw value for an unparseable date. */
export function relativeAge(value: string, locale: string, now = Date.now()): string {
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return value;
  const diff = ms - now;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return formatter.format(Math.round(diff / size), unit);
  }
  return formatter.format(0, 'minute');
}
