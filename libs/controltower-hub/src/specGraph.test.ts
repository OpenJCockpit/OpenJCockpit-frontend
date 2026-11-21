import { describe, expect, it } from 'vitest';
import { deriveBlockers, draftReviewOrder, isBlocked } from './specGraph';

const spec = (id: string, status: string, dependsOn: string[] = []) => ({
  id,
  status: status as 'DRAFT',
  dependsOn,
});

describe('deriveBlockers', () => {
  it('lists unfinished dependencies and dependents', () => {
    const map = deriveBlockers([
      spec('a', 'DONE'),
      spec('b', 'APPROVED', ['a']),
      spec('c', 'DRAFT', ['b']),
    ]);
    expect(map.get('a')).toEqual({ blockedBy: [], missing: [], blocks: ['b'] });
    expect(map.get('b')).toEqual({ blockedBy: [], missing: [], blocks: ['c'] });
    expect(map.get('c')).toEqual({ blockedBy: ['b'], missing: [], blocks: [] });
  });

  it('reports nothing blocked in an all-done chain', () => {
    const map = deriveBlockers([spec('a', 'DONE'), spec('b', 'DONE', ['a'])]);
    expect([...map.values()].some(isBlocked)).toBe(false);
  });

  it('reports unknown dependency IDs as missing', () => {
    const map = deriveBlockers([spec('a', 'APPROVED', ['ghost'])]);
    expect(map.get('a')).toEqual({ blockedBy: [], missing: ['ghost'], blocks: [] });
    expect(isBlocked(map.get('a'))).toBe(true);
  });

  it('terminates on cycles and self references', () => {
    const map = deriveBlockers([
      spec('a', 'DRAFT', ['b']),
      spec('b', 'DRAFT', ['a']),
      spec('c', 'DRAFT', ['c']),
    ]);
    expect(map.get('a')?.blockedBy).toEqual(['b']);
    expect(map.get('b')?.blockedBy).toEqual(['a']);
    expect(map.get('c')?.blockedBy).toEqual(['c']);
  });

  it('ignores duplicate dependency entries', () => {
    const map = deriveBlockers([spec('a', 'DRAFT'), spec('b', 'DRAFT', ['a', 'a'])]);
    expect(map.get('b')?.blockedBy).toEqual(['a']);
    expect(map.get('a')?.blocks).toEqual(['b']);
  });
});

describe('draftReviewOrder', () => {
  const draft = (id: string, specPath: string, dependsOn: string[] = [], status = 'DRAFT') => ({
    ...spec(id, status, dependsOn),
    specPath,
  });

  it('puts dependencies first and otherwise goes oldest first', () => {
    const order = draftReviewOrder([
      draft('c', '003-c.md'),
      draft('b', '002-b.md', ['c']),
      draft('a', '001-a.md', ['b']),
      draft('x', '004-x.md', [], 'APPROVED'),
    ]);
    expect(order.map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });

  it('survives a dependency cycle', () => {
    const order = draftReviewOrder([draft('a', '001-a.md', ['b']), draft('b', '002-b.md', ['a'])]);
    expect(order.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
