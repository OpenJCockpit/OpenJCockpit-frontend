import { describe, expect, it } from 'vitest';
import type { SpecQueue } from '@openjcockpit/api';
import { gitStatusKind, queueStateKind, summarizeQueue } from './statusBarModel';

const item = (status: string) => ({ status }) as SpecQueue['items'][number];

describe('summarizeQueue', () => {
  it('counts live items per group in display order and omits zeros', () => {
    const summary = summarizeQueue({
      state: 'ACTIVE',
      items: [
        item('QUEUED'),
        item('QUEUED'),
        item('RUNNING'),
        item('STARTING'),
        item('AWAITING_MERGE'),
        item('MERGING'),
        item('FAILED'),
      ],
    });
    expect(summary).toEqual({
      state: 'ACTIVE',
      counts: [
        { key: 'running', count: 2 },
        { key: 'queued', count: 2 },
        { key: 'awaitingMerge', count: 2 },
        { key: 'failed', count: 1 },
      ],
    });
  });

  it('ignores finished, skipped, cancelled and removed items', () => {
    const summary = summarizeQueue({
      state: 'PAUSED',
      items: ['MERGED', 'COMPLETED_NO_CHANGES', 'SKIPPED', 'CANCELLED', 'REMOVED'].map(item),
    });
    expect(summary.counts).toEqual([]);
  });
});

describe('kinds', () => {
  it('maps queue state, with activity only mattering while active', () => {
    expect(queueStateKind('HALTED', true)).toBe('error');
    expect(queueStateKind('PAUSED', false)).toBe('waiting');
    expect(queueStateKind('ACTIVE', true)).toBe('active');
    expect(queueStateKind('ACTIVE', false)).toBe('ok');
  });

  it('maps git status', () => {
    expect(gitStatusKind('ACCESSIBLE')).toBe('ok');
    expect(gitStatusKind('NOT_ACCESSIBLE')).toBe('error');
    expect(gitStatusKind('CHECK_FAILED')).toBe('error');
    expect(gitStatusKind('UNKNOWN')).toBe('neutral');
  });
});
