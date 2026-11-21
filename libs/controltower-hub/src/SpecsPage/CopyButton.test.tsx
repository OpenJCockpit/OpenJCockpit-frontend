import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WithTranslations } from '../registerTranslations';
import { renderWith } from '../testUtils';
import { CopyButton } from './CopyButton';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('CopyButton', () => {
  it('says "Copied" for a moment and then goes back to its label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderWith(
      <WithTranslations>
        <CopyButton text="spec/s1" label="Copy branch name" />
      </WithTranslations>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy branch name' }));
    await act(async () => undefined);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy branch name' })).toBeInTheDocument();
  });
});
