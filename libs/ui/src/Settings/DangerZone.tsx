import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { Button } from '../Button/Button';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { cx } from '../cx';
import styles from './Settings.module.scss';

interface DangerZoneProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description: ReactNode;
  /** Label of the button that opens the confirmation. */
  actionLabel: string;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel: string;
  cancelLabel: string;
  busyLabel: string;
  /** Shown in the dialog when `onConfirm` rejects; the dialog then stays open. */
  failedLabel: string;
  /** Runs after the user confirms. The dialog closes when it resolves. */
  onConfirm: () => Promise<unknown> | void;
}

/** Bordered block for a destructive action that always asks first. */
export function DangerZone({
  title,
  description,
  actionLabel,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  cancelLabel,
  busyLabel,
  failedLabel,
  onConfirm,
  className,
  ...rest
}: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setError(null);
  };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setError(failedLabel);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={cx(styles.danger, className)} {...rest}>
      <div className={styles.rowText}>
        <h3 className={styles.dangerTitle}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        {actionLabel}
      </Button>
      {open ? (
        <ConfirmDialog
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          busyLabel={busyLabel}
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={close}
        />
      ) : null}
    </section>
  );
}
