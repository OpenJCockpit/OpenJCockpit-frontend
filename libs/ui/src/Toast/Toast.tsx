import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Toast.module.scss';

export interface ToastItem {
  id: number;
  message: ReactNode;
  variant: 'success' | 'info';
}

/** Written out so the style check sees both classes in use. */
const VARIANT_CLASS: Record<ToastItem['variant'], string> = {
  success: styles.success,
  info: styles.info,
};

/** Success toasts disappear on their own after this long. */
export const TOAST_DURATION_MS = 5000;

/** Holds the visible toasts. Render them with `ToastRegion`. */
export function useToasts(durationMs: number = TOAST_DURATION_MS) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: ReactNode, variant: ToastItem['variant'] = 'success') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), durationMs),
      );
      return id;
    },
    [dismiss, durationMs],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) clearTimeout(timer);
      active.clear();
    };
  }, []);

  return { toasts, show, dismiss };
}

interface ToastRegionProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  /** Translated label of the dismiss button. */
  dismissLabel: string;
}

/** Polite live region in the corner of the screen; always mounted so screen readers pick up new toasts. */
export function ToastRegion({ toasts, onDismiss, dismissLabel }: ToastRegionProps) {
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={cx(styles.toast, VARIANT_CLASS[toast.variant])}>
          <span>{toast.message}</span>
          <button
            type="button"
            className={styles.dismiss}
            aria-label={dismissLabel}
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
