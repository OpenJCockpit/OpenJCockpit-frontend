import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlob } from './saveBlob';

describe('saveBlob', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads through a temporary anchor and cleans up', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    saveBlob(new Blob(['a']), 'f.csv');
    const seen = click.mock.contexts[0] as HTMLAnchorElement;
    expect(seen.download).toBe('f.csv');
    expect(seen.href).toBe('blob:x');
    expect(document.body.contains(seen)).toBe(false);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    vi.unstubAllGlobals();
  });
});
