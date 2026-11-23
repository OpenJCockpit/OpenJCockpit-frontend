import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Settings.module.scss';

interface SettingsRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  label: ReactNode;
  description?: ReactNode;
  /** Id of the control, so the label is wired to it. */
  htmlFor?: string;
  /** The control: a toggle, select or single value. Stacks under the label on narrow screens. */
  children: ReactNode;
}

/** Label and description on the left, one control on the right: for toggles and single-value settings. */
export function SettingsRow({
  label,
  description,
  htmlFor,
  className,
  children,
  ...rest
}: SettingsRowProps) {
  return (
    <div className={cx(styles.row, className)} {...rest}>
      <div className={styles.rowText}>
        <label htmlFor={htmlFor} className={styles.rowLabel}>
          {label}
        </label>
        {description ? <span className={styles.description}>{description}</span> : null}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}
