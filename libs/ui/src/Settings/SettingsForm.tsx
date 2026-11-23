import type { FormEvent, FormHTMLAttributes, ReactNode } from 'react';
import { Button } from '../Button/Button';
import { cx } from '../cx';
import { StatusMessage } from '../StatusMessage/StatusMessage';
import { useReportSettingsDirty } from './SettingsDirty';
import styles from './Settings.module.scss';

interface SettingsFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSubmit: () => void;
  /** Unsaved edits exist: enables Save and Reset. */
  dirty: boolean;
  saving?: boolean;
  /** Message of the failed save, shown as an alert. */
  error?: string | null;
  /** The last save succeeded and nothing was edited since. */
  saved?: boolean;
  /** Restores the loaded values; the Reset button is hidden when omitted. */
  onReset?: () => void;
  saveLabel: string;
  savingLabel: string;
  savedLabel: string;
  resetLabel: string;
  children: ReactNode;
}

/** The one settings form: standard grid, error summary, and a sticky footer with Save and Reset. */
export function SettingsForm({
  onSubmit,
  dirty,
  saving = false,
  error,
  saved = false,
  onReset,
  saveLabel,
  savingLabel,
  savedLabel,
  resetLabel,
  className,
  children,
  ...rest
}: SettingsFormProps) {
  useReportSettingsDirty(dirty);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dirty && !saving) onSubmit();
  };
  return (
    <form className={cx(styles.form, className)} onSubmit={handleSubmit} {...rest}>
      <div className={styles.formBody}>{children}</div>
      {error ? (
        <StatusMessage variant="error" role="alert">
          {error}
        </StatusMessage>
      ) : null}
      <div className={styles.formFooter}>
        <Button type="submit" variant="primary" disabled={!dirty || saving}>
          {saving ? savingLabel : saveLabel}
        </Button>
        {onReset ? (
          <Button type="button" variant="secondary" disabled={!dirty || saving} onClick={onReset}>
            {resetLabel}
          </Button>
        ) : null}
        {saved && !dirty && !error ? (
          <p className={styles.formMessage} role="status">
            {savedLabel}
          </p>
        ) : null}
      </div>
    </form>
  );
}
