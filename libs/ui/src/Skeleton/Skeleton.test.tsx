import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology and takes its size', () => {
    render(<Skeleton width="120px" height="2em" />);
    const el = screen.getByTestId('skeleton');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveStyle('--skeleton-width: 120px; --skeleton-height: 2em');
  });

  it('falls back to the stylesheet size without width or height', () => {
    render(<Skeleton />);
    const el = screen.getByTestId('skeleton');
    expect(el.style.getPropertyValue('--skeleton-width')).toBe('');
    expect(el.style.getPropertyValue('--skeleton-height')).toBe('');
  });
});
