import type { GitStatus, SpecQueue, SpecQueueItemStatus } from '@openjcockpit/api';
import type { StatusKind } from '@openjcockpit/ui';

export type QueueCountKey = 'running' | 'queued' | 'awaitingMerge' | 'failed';

export interface QueueSummary {
  state: SpecQueue['state'];
  /** Non-zero counts only, in display order. */
  counts: { key: QueueCountKey; count: number }[];
}

const COUNT_BY_STATUS: Partial<Record<SpecQueueItemStatus, QueueCountKey>> = {
  STARTING: 'running',
  RUNNING: 'running',
  QUEUED: 'queued',
  AWAITING_MERGE: 'awaitingMerge',
  MERGING: 'awaitingMerge',
  FAILED: 'failed',
};

const COUNT_ORDER: QueueCountKey[] = ['running', 'queued', 'awaitingMerge', 'failed'];

/** Counts the queue's live items; finished, skipped and cancelled items do not need anyone's attention. */
export function summarizeQueue(queue: Pick<SpecQueue, 'state' | 'items'>): QueueSummary {
  const totals: Record<QueueCountKey, number> = {
    running: 0,
    queued: 0,
    awaitingMerge: 0,
    failed: 0,
  };
  for (const item of queue.items) {
    const key = COUNT_BY_STATUS[item.status];
    if (key) totals[key] += 1;
  }
  return {
    state: queue.state,
    counts: COUNT_ORDER.filter((key) => totals[key] > 0).map((key) => ({
      key,
      count: totals[key],
    })),
  };
}

export function queueStateKind(state: SpecQueue['state'], running: boolean): StatusKind {
  if (state === 'HALTED') return 'error';
  if (state === 'PAUSED') return 'waiting';
  return running ? 'active' : 'ok';
}

export function gitStatusKind(status: GitStatus): StatusKind {
  switch (status) {
    case 'ACCESSIBLE':
      return 'ok';
    case 'NOT_ACCESSIBLE':
    case 'CHECK_FAILED':
      return 'error';
    default:
      return 'neutral';
  }
}
