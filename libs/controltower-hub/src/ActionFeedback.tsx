import { StatusMessage } from '@openjcockpit/ui';
import type { ActionOutcome } from './useAction';

/** The outcome of an action from `useAction`: a status line on success, an alert on failure. */
export function ActionFeedback({ feedback }: { feedback: ActionOutcome | null }) {
  if (!feedback) return null;
  return (
    <StatusMessage role={feedback.ok ? 'status' : 'alert'} variant={feedback.ok ? 'info' : 'error'}>
      {feedback.message}
      {feedback.detail && <small> {feedback.detail}</small>}
      {feedback.next && <> {feedback.next}</>}
    </StatusMessage>
  );
}
