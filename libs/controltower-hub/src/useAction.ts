import { useCallback, useState, type ReactNode } from 'react';
import { errorMessage } from './errorMessage';

/** The outcome of an action: `ok` picks the status or alert role, `detail` is an optional secondary line. */
export interface ActionOutcome {
  ok: boolean;
  message: string;
  detail?: string;
  /** A follow-up link or button shown after the message. */
  next?: ReactNode;
}

interface RunOptions {
  /** Text for a failure; defaults to the error's own message. */
  onError?: (error: unknown) => string;
}

/**
 * Runs an async action and keeps its outcome. Starting a run clears the previous feedback; a thrown
 * error becomes failed feedback. `success` turns the result into feedback; leave it out when the
 * action needs no confirmation.
 */
export function useAction() {
  const [feedback, setFeedback] = useState<ActionOutcome | null>(null);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T>(
      action: () => Promise<T>,
      success?: (result: T) => string | ActionOutcome,
      options?: RunOptions,
    ) => {
      setFeedback(null);
      setPending(true);
      try {
        const result = await action();
        if (success) {
          const outcome = success(result);
          setFeedback(typeof outcome === 'string' ? { ok: true, message: outcome } : outcome);
        }
      } catch (e) {
        setFeedback({ ok: false, message: options?.onError?.(e) ?? errorMessage(e) });
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const clear = useCallback(() => setFeedback(null), []);

  return { run, feedback, pending, clear };
}

/** The `run` function of `useAction`, for components that receive it from a parent. */
export type RunAction = ReturnType<typeof useAction>['run'];
