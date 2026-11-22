import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import { StatusChip, type StatusKind } from '../StatusChip/StatusChip';
import styles from './Settings.module.scss';

export type SettingsConnectionState = 'connected' | 'notConfigured' | 'failing';

const KIND: Record<SettingsConnectionState, StatusKind> = {
  connected: 'ok',
  notConfigured: 'neutral',
  failing: 'error',
};

interface SettingsStatusProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  state: SettingsConnectionState;
  /** Translated state name; the chip colour never carries the meaning alone. */
  label: string;
  /** Extra line, e.g. the endpoint or the failure reason. */
  detail?: ReactNode;
}

/** Connection or health line shared by the integration sections. */
export function SettingsStatus({ state, label, detail, className, ...rest }: SettingsStatusProps) {
  return (
    <div className={cx(styles.status, className)} {...rest}>
      <StatusChip kind={KIND[state]} label={label} />
      {detail ? <span className={styles.statusDetail}>{detail}</span> : null}
    </div>
  );
}
