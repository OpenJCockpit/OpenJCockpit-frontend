import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '../core/http';
import { ApiError } from '../core/http';
import {
  cancelEvidenceExport,
  createEvidenceExport,
  downloadEvidenceExport,
  exportEvidenceRun,
  getEvidenceExport,
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
  describe('export', () => {
    const file = (name: string | null) => ({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['x'])),
      headers: new Headers(name ? { 'Content-Disposition': `attachment; filename="${name}"` } : {}),
    });

    it('exportEvidenceRun GETs the export with format and includeOutputs, and uses the server filename', async () => {
      mockFetch.mockResolvedValue(file('evidence-r1.csv'));
      const result = await exportEvidenceRun('p1', 'r 1', { format: 'csv' });
      expect(mockFetch.mock.calls[0]![0]).toBe(
        '/api/projects/p1/evidence/runs/r%201/export?format=csv&includeOutputs=false',
      );
      expect(mockFetch.mock.calls[0]![1].headers).toMatchObject({ Authorization: 'Bearer tok' });
      expect(result.filename).toBe('evidence-r1.csv');
      expect(await result.blob.text()).toBe('x');
    });

    it.each([
      ['json', 'json'],
      ['csv', 'csv'],
      ['markdown', 'md'],
      ['pdf', 'pdf'],
    ] as const)(
      'exportEvidenceRun falls back to evidence-<runId>.<ext> for %s',
      async (format, ext) => {
        mockFetch.mockResolvedValue(file(null));
        const result = await exportEvidenceRun('p1', 'r1', { format, includeOutputs: true });
        expect(result.filename).toBe(`evidence-r1.${ext}`);
        expect(mockFetch.mock.calls[0]![0]).toContain('includeOutputs=true');
      },
    );

    it('exportEvidenceRun rejects for a run of another project', async () => {
      mockFetch.mockResolvedValue(fail(404));
      await expect(exportEvidenceRun('p1', 'r1', { format: 'json' })).rejects.toMatchObject({
        status: 404,
      });
    });

    it('createEvidenceExport POSTs the request and resolves with the job', async () => {
      mockFetch.mockResolvedValue(ok({ jobId: 'j1', status: 'queued' }));
      const request = {
        scope: 'workflow',
        workflowId: 'w1',
        format: 'pdf',
        includeOutputs: false,
      } as const;
      await expect(createEvidenceExport('p1', request)).resolves.toEqual({
        jobId: 'j1',
        status: 'queued',
      });
      expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p1/evidence/exports');
      expect(mockFetch.mock.calls[0]![1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify(request),
      });
    });

    it('createEvidenceExport explains a 429 as too many jobs', async () => {
      mockFetch.mockResolvedValue(fail(429));
      const error = await createEvidenceExport('p1', { scope: 'project', format: 'csv' }).catch(
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 429, message: 'Too many export jobs running: 429' });
    });

    it('getEvidenceExport GETs the job status and encodes the ids', async () => {
      const job = { jobId: 'j/1', status: 'running', progress: { runsDone: 1, runsTotal: 4 } };
      mockFetch.mockResolvedValue(ok(job));
      await expect(getEvidenceExport('p1', 'j/1')).resolves.toEqual(job);
      expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p1/evidence/exports/j%2F1');
    });

    it('downloadEvidenceExport returns the file, with a fallback filename', async () => {
      mockFetch.mockResolvedValueOnce(file('evidence-w1-runs.json'));
      mockFetch.mockResolvedValueOnce(file(null));
      expect((await downloadEvidenceExport('p1', 'j1')).filename).toBe('evidence-w1-runs.json');
      expect((await downloadEvidenceExport('p1', 'j1')).filename).toBe('evidence-j1');
      expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p1/evidence/exports/j1/download');
    });

    it('downloadEvidenceExport keeps the status for a not-ready (409) and an expired (410) job', async () => {
      mockFetch.mockResolvedValueOnce(fail(409));
      mockFetch.mockResolvedValueOnce(fail(410));
      await expect(downloadEvidenceExport('p1', 'j1')).rejects.toMatchObject({ status: 409 });
      await expect(downloadEvidenceExport('p1', 'j1')).rejects.toMatchObject({
        status: 410,
        message: 'The evidence export has expired: 410',
      });
    });

    it('cancelEvidenceExport DELETEs the job', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 204 });
      await cancelEvidenceExport('p1', 'j1');
      expect(mockFetch.mock.calls[0]![0]).toBe('/api/projects/p1/evidence/exports/j1');
      expect(mockFetch.mock.calls[0]![1]).toMatchObject({ method: 'DELETE' });
    });
  });
});
