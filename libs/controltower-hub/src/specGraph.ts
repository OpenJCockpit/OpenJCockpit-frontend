import type { ControlTowerSpec } from '@openjcockpit/api';

export interface SpecBlockers {
  /** Direct dependencies that exist but are not `DONE`, in `dependsOn` order. */
  blockedBy: string[];
  /** Direct dependencies that match no spec; they cannot be finished, so they count as blocking too. */
  missing: string[];
  /** Specs that list this one in their `dependsOn`, in input order. */
  blocks: string[];
}

/** One-hop blockers and dependents per spec ID. Cycles and unknown IDs are harmless: nothing is followed transitively. */
export function deriveBlockers(
  specs: readonly Pick<ControlTowerSpec, 'id' | 'status' | 'dependsOn'>[],
): Map<string, SpecBlockers> {
  const byId = new Map(specs.map((s) => [s.id, s]));
  const result = new Map<string, SpecBlockers>(
    specs.map((s) => [s.id, { blockedBy: [], missing: [], blocks: [] }]),
  );
  for (const spec of specs) {
    const entry = result.get(spec.id);
    if (!entry) continue;
    for (const depId of new Set(spec.dependsOn)) {
      const dep = byId.get(depId);
      if (!dep) entry.missing.push(depId);
      else if (dep.status !== 'DONE') entry.blockedBy.push(depId);
      result.get(depId)?.blocks.push(spec.id);
    }
  }
  return result;
}

/** True when the spec waits on something: an unfinished or unknown dependency. */
export function isBlocked(blockers: SpecBlockers | undefined): boolean {
  return blockers !== undefined && blockers.blockedBy.length + blockers.missing.length > 0;
}
