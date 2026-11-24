import { mockEvidenceRun, mockEvidenceRuns } from '../../../../libs/api/src/testing/mockEvidence';
import type {
  EvidenceExportFormat,
  EvidenceExportJob,
  EvidenceRun,
} from '../../../../libs/api/src/evidence/evidenceTypes';
import { MockError, nextId, notFound } from '../store';
import { del, get, MockFile, post, str } from './router';

// ── Execution evidence: export ───────────────────────────────────────────
// Run export is a synchronous file. Workflow and project exports are jobs that move queued → running
// (one run per second) → done, derived from the clock so no timers are needed. A workflow export
// for workflowId "fail" ends failed, and the 3rd job of a project answers 429.
const EXTENSION: Record<EvidenceExportFormat, string> = {
  json: 'json',
  csv: 'csv',
  markdown: 'md',
  pdf: 'pdf',
};
const CONTENT_TYPE: Record<EvidenceExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
  markdown: 'text/markdown',
  pdf: 'application/pdf',
};
const CSV_COLUMNS = 'runId,workflowId,timestamp,source,status,agentId,actor,title,detail,outputRef';
const STEP_MS = 1000;
const TTL_MS = 60 * 60 * 1000;
const MAX_ACTIVE_JOBS = 2;

const isFormat = (value: string): value is EvidenceExportFormat => value in EXTENSION;
const csvCell = (value: unknown) => {
  const text = value == null ? '' : String(value);
  const safe = ['=', '+', '-', '@', '\t', '\r'].some((c) => text.startsWith(c)) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

function csv(runs: EvidenceRun[]) {
  const rows = runs.flatMap((run) =>
    run.events.map((e) =>
      [
        run.details.runId,
        run.details.workflowId,
        e.timestamp,
        e.source,
        e.status,
        e.agentId,
        e.actor,
        e.title,
        e.detail,
        e.outputRef,
      ]
        .map(csvCell)
        .join(','),
    ),
  );
  return [CSV_COLUMNS, ...rows].join('\n') + '\n';
}

function markdown(runs: EvidenceRun[]) {
  const sections = runs.map(
    (run) =>
      `## Run ${run.details.runId}\n\n- Workflow: ${run.details.workflowId}\n- Status: ${run.details.status}\n\n` +
      run.events.map((e) => `- ${e.timestamp} **${e.source}** ${e.title}`).join('\n'),
  );
  return `# Evidence export\n\n${sections.join('\n\n')}\n`;
}

// Smallest valid one-page PDF, built with correct xref offsets so viewers open it without repair.
function pdf(title: string) {
  const text = title.replace(/[()\\]/g, '');
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = out.length;
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  return `${out}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

function render(format: EvidenceExportFormat, runs: EvidenceRun[], scope: string) {
  switch (format) {
    case 'json':
      return JSON.stringify(
        runs.length === 1 && scope === 'run'
          ? runs[0]
          : { scope, exportedAt: new Date().toISOString(), runs },
        null,
        2,
      );
    case 'csv':
      return csv(runs);
    case 'markdown':
      return markdown(runs);
    case 'pdf':
      return pdf(`Evidence export: ${runs.length} run(s)`);
  }
}

get('/api/projects/:id/evidence/runs/:runId/export', ({ p, query }) => {
  const format = query.get('format') ?? '';
  if (!isFormat(format)) throw new MockError(400, 'BAD_REQUEST', `Unknown format: ${format}`);
  const run = mockEvidenceRun(p[1]);
  if (!run) throw notFound('Run');
  return new MockFile(
    `evidence-${p[1]}.${EXTENSION[format]}`,
    CONTENT_TYPE[format],
    render(format, [run], 'run'),
  );
});

interface Job {
  id: string;
  projectId: string;
  format: EvidenceExportFormat;
  workflowId?: string;
  runIds: string[];
  createdAt: number;
  cancelledAt?: number;
  fails: boolean;
}
const jobs = new Map<string, Job>();

function status(job: Job, now = Date.now()): EvidenceExportJob {
  const total = job.runIds.length;
  const elapsed = now - job.createdAt;
  const progress = (runsDone: number) => ({ runsDone, runsTotal: total });
  const base = { jobId: job.id, expiresAt: new Date(job.createdAt + TTL_MS).toISOString() };
  if (job.cancelledAt) return { ...base, status: 'cancelled', progress: progress(0) };
  if (elapsed < STEP_MS) return { ...base, status: 'queued', progress: progress(0) };
  const done = Math.min(total, Math.floor(elapsed / STEP_MS) - 1);
  if (job.fails && done >= Math.ceil(total / 2))
    return { ...base, status: 'failed', progress: progress(done), error: 'Export failed' };
  if (done < total) return { ...base, status: 'running', progress: progress(done) };
  const scope = job.workflowId ? job.workflowId : 'all';
  return {
    ...base,
    status: 'done',
    progress: progress(total),
    filename: `evidence-${job.workflowId ? `${scope}-runs` : 'project-all'}.${EXTENSION[job.format]}`,
    sizeBytes: 2048,
  };
}

const jobOf = (projectId: string, jobId: string) => {
  const job = jobs.get(jobId);
  if (!job || job.projectId !== projectId) throw notFound('Export job');
  return job;
};

post('/api/projects/:id/evidence/exports', ({ p, body }) => {
  const format = str(body.format);
  const scope = str(body.scope);
  const workflowId = str(body.workflowId) || undefined;
  if (!isFormat(format)) throw new MockError(400, 'BAD_REQUEST', `Unknown format: ${format}`);
  if (scope !== 'workflow' && scope !== 'project')
    throw new MockError(400, 'BAD_REQUEST', 'Unknown scope');
  if (scope === 'workflow' && !workflowId)
    throw new MockError(400, 'BAD_REQUEST', 'workflowId is required for workflow scope');
  const now = Date.now();
  const active = [...jobs.values()].filter(
    (job) => job.projectId === p[0] && !job.cancelledAt && status(job, now).status !== 'done',
  );
  if (active.length >= MAX_ACTIVE_JOBS)
    throw new MockError(429, 'TOO_MANY_EXPORTS', 'Too many export jobs running');
  const runIds = mockEvidenceRuns(now, { limit: 1000 })
    .items.filter((run) => scope === 'project' || run.workflowId === workflowId)
    .map((run) => run.runId);
  const job: Job = {
    id: crypto.randomUUID(),
    projectId: p[0],
    format,
    workflowId,
    runIds,
    createdAt: now,
    fails: workflowId === 'fail',
  };
  jobs.set(job.id, job);
  return { jobId: job.id, status: 'queued' };
});

get('/api/projects/:id/evidence/exports/:jobId', ({ p }) => status(jobOf(p[0], p[1])));

get('/api/projects/:id/evidence/exports/:jobId/download', ({ p }) => {
  const job = jobOf(p[0], p[1]);
  const current = status(job);
  if (current.status !== 'done')
    throw new MockError(409, 'EXPORT_NOT_READY', 'The export is not done yet');
  const runs = job.runIds.flatMap((id) => mockEvidenceRun(id) ?? []);
  return new MockFile(
    current.filename ?? `evidence-${nextId('export')}`,
    CONTENT_TYPE[job.format],
    render(job.format, runs, job.workflowId ? 'workflow' : 'project'),
  );
});

del('/api/projects/:id/evidence/exports/:jobId', ({ p }) => {
  jobOf(p[0], p[1]).cancelledAt = Date.now();
  return {};
});
