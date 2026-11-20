import type { ControlTowerSpec, ControlTowerSpecStatus } from '@openjcockpit/api';
import { draftReviewOrder } from '../specGraph';

export const SPEC_STATUSES: readonly ControlTowerSpecStatus[] = [
  'DRAFT',
  'APPROVED',
  'DISPATCHED',
  'DONE',
];

export interface SpecFilter {
  status: ControlTowerSpecStatus | null;
  query: string;
  /** Only specs generated from this interview. */
  interviewId: string | null;
}

/** Reads the filter from the URL; an unknown status is ignored. */
export function filterFromParams(params: URLSearchParams): SpecFilter {
  const status = SPEC_STATUSES.find((s) => s === params.get('status')) ?? null;
  return { status, query: params.get('q') ?? '', interviewId: params.get('interview') };
}

/** Specs of the given status (or all) whose title or ID contains the query, case-insensitively. */
export function filterSpecs(
  specs: readonly ControlTowerSpec[],
  { status, query, interviewId }: SpecFilter,
): ControlTowerSpec[] {
  const needle = query.trim().toLowerCase();
  return specs.filter(
    (s) =>
      (status === null || s.status === status) &&
      (interviewId === null || s.interviewId === interviewId) &&
      (needle === '' || [s.title, s.id].some((text) => text.toLowerCase().includes(needle))),
  );
}

export function countByStatus(
  specs: readonly ControlTowerSpec[],
): Record<ControlTowerSpecStatus, number> {
  const counts = { DRAFT: 0, APPROVED: 0, DISPATCHED: 0, DONE: 0 };
  for (const s of specs) counts[s.status] += 1;
  return counts;
}

/** Newest first: spec paths start with a creation-order number (`001-…`), unlike the random IDs. */
export function newestFirst(specs: readonly ControlTowerSpec[]): ControlTowerSpec[] {
  return [...specs].sort((a, b) =>
    b.specPath.localeCompare(a.specPath, undefined, { numeric: true }),
  );
}

/**
 * Draft, approved, dispatched, then done. Drafts are in review order (a draft after the drafts it
 * depends on, so the order matches the execution order); the other statuses are newest first.
 */
export function byStatusThenNewest(specs: readonly ControlTowerSpec[]): ControlTowerSpec[] {
  const rest = [...newestFirst(specs.filter((s) => s.status !== 'DRAFT'))].sort(
    (a, b) => SPEC_STATUSES.indexOf(a.status) - SPEC_STATUSES.indexOf(b.status),
  );
  return [...draftReviewOrder(specs), ...rest];
}
