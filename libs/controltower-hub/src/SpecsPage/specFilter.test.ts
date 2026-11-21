import { describe, expect, it } from 'vitest';
import { SPEC_DRAFT } from '../testUtils';
import { filterFromParams, filterSpecs } from './specFilter';

describe('interview filter', () => {
  const other = { ...SPEC_DRAFT, id: 's2', interviewId: 'i2' };
  const legacy = { ...SPEC_DRAFT, id: 's3', interviewId: null };

  it('reads the interview from the URL', () => {
    expect(filterFromParams(new URLSearchParams('interview=i2')).interviewId).toBe('i2');
    expect(filterFromParams(new URLSearchParams()).interviewId).toBeNull();
  });

  it('keeps only specs generated from that interview', () => {
    const filter = { status: null, query: '', interviewId: 'i2' };
    expect(filterSpecs([SPEC_DRAFT, other, legacy], filter)).toEqual([other]);
    expect(filterSpecs([SPEC_DRAFT, other, legacy], { ...filter, interviewId: null })).toHaveLength(
      3,
    );
  });
});
