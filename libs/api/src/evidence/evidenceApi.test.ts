import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '../core/http';
import {
  loadEvidenceOutput,
  loadEvidenceRun,
  loadEvidenceRuns,
  loadLatestEvidenceRun,
} from './evidenceApi';

const mockFetch = vi.fn();

function ok(body?: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}
function fail(status: number) {
  return { ok: false, status, json: () => Promise.reject(new Error('not json')) };
}

describe('evidenceApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    setAuthToken('tok');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loadEvidenceRuns GETs the run list, with paging only when given', async () => {
    mockFetch.mockResolvedValue(ok({ items: [], total: 0, limit: 20, offset: 0 }));
    await loadEvidenceRuns('p1');
    await loadEvidenceRuns('p1', { limit: 20, offset: 40 });
    expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p1/evidence/runs');
    expect(mockFetch.mock.calls[1]![0]).toBe('/api/projects/p1/evidence/runs?limit=20&offset=40');
  });

  it('loadEvidenceRun GETs one run and encodes the ids', async () => {
    mockFetch.mockResolvedValueOnce(ok({ details: {}, events: [] }));
    await loadEvidenceRun('p/1', 'run 1');
    expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p%2F1/evidence/runs/run%201');
  });

  it('loadLatestEvidenceRun GETs the latest run', async () => {
    mockFetch.mockResolvedValueOnce(ok({ details: { runId: 'r1' }, events: [] }));
    await expect(loadLatestEvidenceRun('p1')).resolves.toEqual({
      details: { runId: 'r1' },
      events: [],
    });
    expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p1/evidence/latest');
  });

  it('loadLatestEvidenceRun turns a 404 into null, but not other failures', async () => {
    mockFetch.mockResolvedValueOnce(fail(404));
    await expect(loadLatestEvidenceRun('p1')).resolves.toBeNull();
    mockFetch.mockResolvedValueOnce(fail(500));
    await expect(loadLatestEvidenceRun('p1')).rejects.toThrow(
      'Failed to load latest evidence run: 500',
    );
  });

  it('loadEvidenceOutput GETs the output of one agent', async () => {
    mockFetch.mockResolvedValueOnce(ok({ agentKey: 'review', output: 'text' }));
    await expect(loadEvidenceOutput('p1', 'r1', 'review')).resolves.toEqual({
      agentKey: 'review',
      output: 'text',
    });
    expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p1/evidence/runs/r1/outputs/review');
  });

  it.each([
    ['loadEvidenceRuns', () => loadEvidenceRuns('p1'), 'Failed to load evidence runs: 500'],
    ['loadEvidenceRun', () => loadEvidenceRun('p1', 'r1'), 'Failed to load evidence run: 404'],
    [
      'loadEvidenceOutput',
      () => loadEvidenceOutput('p1', 'r1', 'a'),
      'Failed to load agent output: 404',
    ],
  ])('%s rejects with a prefixed error', async (_name, call, message) => {
    mockFetch.mockResolvedValueOnce(fail(Number(message.slice(-3))));
    await expect(call()).rejects.toThrow(message);
  });
});
