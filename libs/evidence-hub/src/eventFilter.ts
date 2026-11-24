import type { EvidenceSource, EvidenceStatus, EvidenceTimelineEvent } from '@openjcockpit/api';

export interface EventFilter {
  source: EvidenceSource | 'all';
  status: EvidenceStatus | 'all';
  failedOnly: boolean;
}

export const NO_FILTER: EventFilter = { source: 'all', status: 'all', failedOnly: false };

export const SOURCES: EvidenceSource[] = ['agent', 'approval', 'git'];
export const STATUSES: EvidenceStatus[] = ['ok', 'running', 'waiting', 'failed'];

export function isFiltering(filter: EventFilter): boolean {
  return filter.source !== 'all' || filter.status !== 'all' || filter.failedOnly;
}

/** Events matching every active filter; "failed only" wins over the status choice. */
export function filterEvents(
  events: EvidenceTimelineEvent[],
  filter: EventFilter,
): EvidenceTimelineEvent[] {
  const status = filter.failedOnly ? 'failed' : filter.status;
  return events.filter(
    (event) =>
      (filter.source === 'all' || event.source === filter.source) &&
      (status === 'all' || event.status === status),
  );
}
