import type {
  EvidenceOutput,
  EvidenceRun,
  EvidenceRunPage,
  EvidenceRunSummary,
  EvidenceTimelineEvent,
} from '../evidence/evidenceTypes';

// Fixture runs for the mock API and tests: several past runs, one failed, with agent, approval and
// git events merged. Times are relative to `now`, so "relative age" always reads sensibly.
const MINUTE = 60_000;
const at = (now: number, minutesAgo: number) => new Date(now - minutesAgo * MINUTE).toISOString();

interface Seed {
  runId: string;
  workflowId: string;
  status: string;
  startedBy: string;
  startedMinutesAgo: number;
  durationMinutes: number;
  branch: string;
  commitHash?: string;
  failureSummary?: string;
  artifacts: string[];
  events: (now: number, startedMinutesAgo: number) => EvidenceTimelineEvent[];
}

const agent = (
  now: number,
  minutesAgo: number,
  agentId: string,
  title: string,
  status: EvidenceTimelineEvent['status'] = 'ok',
  extra: Partial<EvidenceTimelineEvent> = {},
): EvidenceTimelineEvent => ({
  timestamp: at(now, minutesAgo),
  source: 'agent',
  agentId,
  title,
  status,
  ...extra,
});

const gitEvent = (
  now: number,
  minutesAgo: number,
  title: string,
  status: EvidenceTimelineEvent['status'] = 'ok',
  detail?: string,
): EvidenceTimelineEvent => ({
  timestamp: at(now, minutesAgo),
  source: 'git',
  title,
  status,
  detail,
});

const SEEDS: Seed[] = [
  {
    runId: 'run-2026-11-24-1303',
    workflowId: 'spec-to-pr',
    status: 'COMPLETED',
    startedBy: 'Jan de Vries',
    startedMinutesAgo: 95,
    durationMinutes: 38,
    branch: 'feature/pricing-rules-update',
    commitHash: '9f3c2ab',
    artifacts: ['pricing-rules.impact.md', 'pricing-rules.tests.md', 'pricing-rules.patch'],
    events: (now, s) => [
      gitEvent(now, s, 'Workflow run started'),
      gitEvent(now, s - 1, 'Cloned repository'),
      gitEvent(now, s - 2, 'Created branch feature/pricing-rules-update'),
      agent(now, s - 4, 'requirement', 'Spec loaded', 'ok', { outputRef: 'requirement' }),
      agent(now, s - 11, 'impact', 'Impact analysis recorded', 'ok', { outputRef: 'impact' }),
      agent(now, s - 19, 'test-design', 'Test set generated', 'ok', { outputRef: 'test-design' }),
      agent(now, s - 27, 'implementation', 'Implementation proposal saved', 'ok', {
        detail: 'Changed PricingRuleValidator and added 14 unit tests.',
        outputRef: 'implementation',
      }),
      {
        timestamp: at(now, s - 33),
        source: 'approval',
        actor: 'Maria Bakker',
        title: 'Approved',
        detail: 'Looks good, ship it.',
        status: 'ok',
      },
      gitEvent(now, s - 36, 'Committed 9f3c2ab'),
      gitEvent(now, s - 38, 'Pushed feature/pricing-rules-update'),
    ],
  },
  {
    runId: 'run-2026-11-24-0942',
    workflowId: 'spec-to-pr',
    status: 'FAILED',
    startedBy: 'Tom Janssen',
    startedMinutesAgo: 260,
    durationMinutes: 14,
    branch: 'feature/approval-flow',
    failureSummary: 'Implementation agent failed: 3 tests still red after 2 repair attempts.',
    artifacts: ['approval-flow.impact.md'],
    events: (now, s) => [
      gitEvent(now, s, 'Workflow run started'),
      gitEvent(now, s - 1, 'Cloned repository'),
      agent(now, s - 3, 'requirement', 'Spec loaded', 'ok', { outputRef: 'requirement' }),
      agent(now, s - 8, 'impact', 'Impact analysis recorded', 'ok', { outputRef: 'impact' }),
      agent(now, s - 14, 'implementation', 'Implementation failed', 'failed', {
        detail: '3 tests still red after 2 repair attempts.',
        outputRef: 'implementation',
      }),
      gitEvent(now, s - 14, 'Run failed', 'failed', 'See the implementation agent output.'),
    ],
  },
  {
    runId: 'run-2026-11-23-1511',
    workflowId: 'spec-to-pr',
    status: 'COMPLETED',
    startedBy: 'Jan de Vries',
    startedMinutesAgo: 1170,
    durationMinutes: 31,
    branch: 'feature/customer-profile-update',
    commitHash: '41d8e07',
    artifacts: ['customer-profile.patch'],
    events: (now, s) => [
      gitEvent(now, s, 'Workflow run started'),
      agent(now, s - 5, 'requirement', 'Spec loaded'),
      agent(now, s - 15, 'implementation', 'Implementation proposal saved'),
      {
        timestamp: at(now, s - 25),
        source: 'approval',
        actor: 'Maria Bakker',
        title: 'Approved',
        status: 'ok',
      },
      gitEvent(now, s - 31, 'Pushed feature/customer-profile-update'),
    ],
  },
  {
    runId: 'run-2026-11-21-0830',
    workflowId: 'review-only',
    status: 'COMPLETED',
    startedBy: 'Tom Janssen',
    startedMinutesAgo: 4400,
    durationMinutes: 9,
    branch: 'main',
    artifacts: [],
    events: (now, s) => [
      gitEvent(now, s, 'Workflow run started'),
      agent(now, s - 9, 'review', 'Review completed'),
    ],
  },
];

function toSummary(seed: Seed, now: number): EvidenceRunSummary {
  const events = seed.events(now, seed.startedMinutesAgo);
  return {
    runId: seed.runId,
    workflowId: seed.workflowId,
    status: seed.status,
    startedAt: at(now, seed.startedMinutesAgo),
    completedAt: at(now, seed.startedMinutesAgo - seed.durationMinutes),
    startedBy: seed.startedBy,
    branch: seed.branch,
    eventCount: events.filter((e) => e.source === 'agent').length,
    failedEventCount: events.filter((e) => e.status === 'failed').length,
  };
}

/** Run list, newest first; paged like the server. */
export function mockEvidenceRuns(
  now = Date.now(),
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
): EvidenceRunPage {
  const all = SEEDS.map((seed) => toSummary(seed, now));
  return { items: all.slice(offset, offset + limit), total: all.length, limit, offset };
}

/** One run with its merged timeline (oldest first), or `undefined` for an unknown run id. */
export function mockEvidenceRun(runId: string, now = Date.now()): EvidenceRun | undefined {
  const seed = SEEDS.find((s) => s.runId === runId);
  if (!seed) return undefined;
  const summary = toSummary(seed, now);
  return {
    details: {
      runId: seed.runId,
      workflowId: seed.workflowId,
      status: seed.status,
      startedBy: seed.startedBy,
      startedAt: summary.startedAt,
      completedAt: summary.completedAt,
      branch: seed.branch,
      commitHash: seed.commitHash ?? null,
      artifacts: seed.artifacts,
      failureSummary: seed.failureSummary ?? null,
    },
    events: seed.events(now, seed.startedMinutesAgo),
  };
}

export const MOCK_LATEST_EVIDENCE_RUN_ID = SEEDS[0]!.runId;

export function mockEvidenceOutput(runId: string, agentKey: string): EvidenceOutput | undefined {
  const run = mockEvidenceRun(runId);
  if (!run?.events.some((event) => event.outputRef === agentKey)) return undefined;
  return {
    agentKey,
    output: `# ${agentKey}\n\nFull output of the ${agentKey} agent for ${runId}.\n\n- Step 1\n- Step 2\n- Step 3`,
  };
}
