import { useEffect, useRef } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { StatusMessage } from '@openjcockpit/ui';
import { useShowToast } from './ToastContext';
import type { ActionOutcome } from './useAction';

/** Inline success messages (outside the shell, where there is no toast) disappear after this long. */
const INLINE_SUCCESS_MS = 5000;

interface Props {
  feedback: ActionOutcome | null;
  /** Clears the feedback; enables the dismiss button and the auto-dismiss of success messages. */
  onDismiss?: () => void;
}

/**
 * The outcome of an action from `useAction`. Success goes to the toast when the shell provides one
 * and otherwise shows inline until it times out; a failure stays inline as an alert until dismissed.
 */
export function ActionFeedback({ feedback, onDismiss }: Props) {
  const { t } = useTranslation('controltower');
  const showToast = useShowToast();
  const ref = useRef<HTMLDivElement>(null);
  const toasted = !!feedback?.ok && !!showToast;

  useEffect(() => {
    if (!feedback) return;
    if (toasted) {
      showToast?.(
        <>
          {feedback.message}
          {feedback.detail && <small> {feedback.detail}</small>}
          {feedback.next && <> {feedback.next}</>}
        </>,
      );
      onDismiss?.();
      return;
    }
    ref.current?.scrollIntoView?.({ block: 'nearest' });
    if (!feedback.ok || !onDismiss) return;
    const timer = setTimeout(onDismiss, INLINE_SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [feedback, toasted, showToast, onDismiss]);

  if (!feedback || toasted) return null;
  return (
    <div ref={ref}>
      <StatusMessage
        role={feedback.ok ? 'status' : 'alert'}
        variant={feedback.ok ? 'info' : 'error'}
      >
        {feedback.message}
        {feedback.detail && <small> {feedback.detail}</small>}
        {feedback.next && <> {feedback.next}</>}
        {onDismiss && (
          <button type="button" aria-label={t('dismiss')} onClick={onDismiss}>
            ×
          </button>
        )}
      </StatusMessage>
    </div>
  );
}
