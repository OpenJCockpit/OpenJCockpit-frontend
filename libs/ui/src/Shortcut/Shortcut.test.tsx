import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Shortcut, usesCommandKey } from './Shortcut';

describe('Shortcut', () => {
  it('renders each key as a key cap', () => {
    const { container } = render(<Shortcut keys={['Ctrl', 'Enter']} />);
    expect(container.querySelectorAll('kbd')).toHaveLength(2);
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });

  it('detects the Cmd key on Apple platforms only', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    expect(usesCommandKey()).toBe(true);
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    expect(usesCommandKey()).toBe(false);
    vi.restoreAllMocks();
  });

  it('recognises the "macOS" platform string that Chrome reports', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgentData: { platform: 'macOS' } });
    expect(usesCommandKey()).toBe(true);
    vi.unstubAllGlobals();
  });
});
