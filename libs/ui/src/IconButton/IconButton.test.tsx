import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('is named by its label and fires onClick', () => {
    const onClick = vi.fn();
    render(<IconButton icon="edit" label="Edit" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows the label as a tooltip on hover', () => {
    render(<IconButton icon="delete" label="Delete" variant="danger" />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Delete');
  });

  it('forwards the ref, disabled and aria-expanded', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<IconButton ref={ref} icon="view" label="Details" disabled aria-expanded={false} />);
    const button = screen.getByRole('button', { name: 'Details' });
    expect(ref.current).toBe(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
