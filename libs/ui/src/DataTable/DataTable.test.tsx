import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HiddenHeader } from './DataTable';

describe('HiddenHeader', () => {
  it('keeps the header text in the DOM for screen readers', () => {
    render(<HiddenHeader>Actions</HiddenHeader>);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
