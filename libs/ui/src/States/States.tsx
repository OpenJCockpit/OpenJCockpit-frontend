import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { fieldErrorClass } from '../Form/Form';
import { cx } from '../cx';

import styles from './States.module.scss';

/** The single ellipsis character for loading copy; use it in the translated strings too. */
export const ELLIPSIS = '…';

interface LoadingStateProps {
  /** Specific copy such as "Loading the queue…"; the caller translates it. */
  children: ReactNode;
  className?: string;
}

/** Inline "still loading" line for panels and widgets. Full-page loading stays `StatusMessage variant="loading"`. */
export function LoadingState({ children, className }: LoadingStateProps) {
  return (
    <p className={cx(styles.loadingState, className)} role="status" aria-live="polite">
      {children}
    </p>
  );
}

interface EmptyStateProps {
  title: ReactNode;
  hint?: ReactNode;
  /** The next step, usually a button or link. */
  action?: ReactNode;
  className?: string;
}

/** Nothing here yet: says so, explains why, and offers the next step if there is one. */
export function EmptyState({ title, hint, action, className }: EmptyStateProps) {
  return (
    <div className={cx(styles.emptyState, className)}>
      <p className={styles.emptyTitle}>{title}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  children: ReactNode;
  onRetry?: () => void;
  /** Translated label of the retry button; required together with `onRetry`. */
  retryLabel?: string;
  className?: string;
}

/** A failed load or save: announced as an alert, with Retry when the caller can retry. */
export function ErrorState({ children, onRetry, retryLabel, className }: ErrorStateProps) {
  return (
    <div className={cx(styles.errorState, className)}>
      <p className={fieldErrorClass} role="alert">
        {children}
      </p>
      {onRetry && retryLabel && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface QueryStateProps<T> {
  /** The slice of a TanStack query this needs; `data === undefined` means "not loaded yet". */
  query: { data?: T | null; isError: boolean; refetch: () => unknown };
  /** Translated copy for a failed load. */
  loadFailed: ReactNode;
  retryLabel: string;
  loadingLabel: ReactNode;
  /** When it returns true for loaded data, `empty` is shown instead of `children`. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  /** Shown when the load succeeded with `null` ("nothing linked"); without it `null` keeps loading. */
  none?: ReactNode;
  children: (data: T) => ReactNode;
}

/** The load-state branch every query-backed panel repeats: data, else error with retry, else loading. */
export function QueryState<T>({
  query,
  loadFailed,
  retryLabel,
  loadingLabel,
  isEmpty,
  empty,
  none,
  children,
}: QueryStateProps<T>) {
  const { data, isError, refetch } = query;
  if (data !== undefined && data !== null) {
    return <>{isEmpty?.(data) ? empty : children(data)}</>;
  }
  if (isError) {
    return (
      <ErrorState onRetry={() => void refetch()} retryLabel={retryLabel}>
        {loadFailed}
      </ErrorState>
    );
  }
  if (data === null && none !== undefined) return <>{none}</>;
  return <LoadingState>{loadingLabel}</LoadingState>;
}
