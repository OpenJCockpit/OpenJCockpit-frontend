import { describe, expect, it } from 'vitest';
import type { EvidenceTimelineEvent } from '@openjcockpit/api';
import { filterEvents, isFiltering, NO_FILTER } from './eventFilter';
import { durationMinutes, relativeAge, runStatusKind } from './runFormat';

const ev = (
  source: EvidenceTimelineEvent['source'],
  status: EvidenceTimelineEvent['status'],
): EvidenceTimelineEvent => ({ timestamp: 't', source, title: 'x', status });

describe('eventFilter', () => {
  const events = [ev('agent', 'ok'), ev('git', 'failed'), ev('approval', 'waiting')];

  it('detects an active filter', () => {
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ ...NO_FILTER, source: 'git' })).toBe(true);
    expect(isFiltering({ ...NO_FILTER, status: 'ok' })).toBe(true);
    expect(isFiltering({ ...NO_FILTER, failedOnly: true })).toBe(true);
  });

  it('filters by source, status and failed-only', () => {
    expect(filterEvents(events, NO_FILTER)).toHaveLength(3);
    expect(filterEvents(events, { ...NO_FILTER, source: 'git' })).toEqual([events[1]]);
    expect(filterEvents(events, { ...NO_FILTER, status: 'ok' })).toEqual([events[0]]);
    expect(filterEvents(events, { ...NO_FILTER, status: 'ok', failedOnly: true })).toEqual([
      events[1],
    ]);
  });
});

describe('runFormat', () => {
  it('maps run statuses to chip kinds', () => {
    expect(runStatusKind('completed')).toBe('done');
    expect(runStatusKind('FAILED')).toBe('error');
    expect(runStatusKind('RUNNING')).toBe('active');
    expect(runStatusKind('WAITING')).toBe('waiting');
    expect(runStatusKind('WAITING_FOR_APPROVAL')).toBe('waiting');
    expect(runStatusKind('whatever')).toBe('neutral');
  });

  it('computes whole minutes or null', () => {
    expect(durationMinutes('2026-01-01T10:00:00Z', '2026-01-01T10:05:00Z')).toBe(5);
    expect(durationMinutes(null, '2026-01-01T10:05:00Z')).toBeNull();
    expect(durationMinutes('2026-01-01T10:05:00Z', '2026-01-01T10:00:00Z')).toBeNull();
    expect(durationMinutes('nope', '2026-01-01T10:00:00Z')).toBeNull();
  });

  it('formats relative ages', () => {
    const now = Date.parse('2026-01-10T12:00:00Z');
    expect(relativeAge('2026-01-08T12:00:00Z', 'en', now)).toBe('2 days ago');
    expect(relativeAge('2026-01-10T09:00:00Z', 'en', now)).toBe('3 hours ago');
    expect(relativeAge('2026-01-10T11:55:00Z', 'en', now)).toBe('5 minutes ago');
    expect(relativeAge('2026-01-10T12:00:10Z', 'en', now)).toBe('this minute');
    expect(relativeAge('garbage', 'en', now)).toBe('garbage');
  });
});
