import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionFeedback } from './ActionFeedback';
import { WithTranslations } from './registerTranslations';
import { ToastProvider } from './ToastContext';
import { renderWith } from './testUtils';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ActionFeedback', () => {
  it('keeps a failure until it is dismissed', () => {
    const onDismiss = vi.fn();
    renderWith(
      <WithTranslations>
        <ActionFeedback feedback={{ ok: false, message: 'Boom' }} onDismiss={onDismiss} />
      </WithTranslations>,
    );
    act(() => void vi.advanceTimersByTime(60_000));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('dismisses an inline success on its own', () => {
    const onDismiss = vi.fn();
    renderWith(
      <WithTranslations>
        <ActionFeedback feedback={{ ok: true, message: 'Saved' }} onDismiss={onDismiss} />
      </WithTranslations>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    act(() => void vi.advanceTimersByTime(5000));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('sends a success to the toast and clears the feedback', () => {
    const onDismiss = vi.fn();
    renderWith(
      <WithTranslations>
        <ToastProvider>
          <ActionFeedback feedback={{ ok: true, message: 'Saved' }} onDismiss={onDismiss} />
        </ToastProvider>
      </WithTranslations>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('still shows a failure inline when there is a toast', () => {
    renderWith(
      <WithTranslations>
        <ToastProvider>
          <ActionFeedback feedback={{ ok: false, message: 'Boom' }} />
        </ToastProvider>
      </WithTranslations>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('shows the detail and next step of a failure inline', () => {
    renderWith(
      <WithTranslations>
        <ActionFeedback
          feedback={{ ok: false, message: 'Boom', detail: 'Because', next: 'Try again' }}
        />
      </WithTranslations>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Boom Because Try again');
  });

  it('puts the detail and next step of a success in the toast', () => {
    renderWith(
      <WithTranslations>
        <ToastProvider>
          <ActionFeedback feedback={{ ok: true, message: 'Saved', detail: 'D', next: 'N' }} />
        </ToastProvider>
      </WithTranslations>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Saved D N');
  });
});
