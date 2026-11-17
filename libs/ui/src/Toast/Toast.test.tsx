import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastRegion, useToasts } from './Toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useToasts', () => {
  it('removes a toast after the duration', () => {
    const { result } = renderHook(() => useToasts(1000));
    act(() => void result.current.show('Saved'));
    expect(result.current.toasts).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('dismisses a toast early', () => {
    const { result } = renderHook(() => useToasts(1000));
    let id = 0;
    act(() => {
      id = result.current.show('Saved');
    });
    act(() => result.current.dismiss(id));
    expect(result.current.toasts).toHaveLength(0);
  });
});

describe('ToastRegion', () => {
  it('renders messages in a status region and dismisses on click', () => {
    const onDismiss = vi.fn();
    render(
      <ToastRegion
        toasts={[{ id: 7, message: '3 drafts created', variant: 'success' }]}
        onDismiss={onDismiss}
        dismissLabel="Dismiss"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('3 drafts created');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith(7);
  });
});
