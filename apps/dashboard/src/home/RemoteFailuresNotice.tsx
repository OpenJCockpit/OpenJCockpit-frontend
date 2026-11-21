import { useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { Button, Icon } from '@openjcockpit/ui';
import { useRemoteFailures } from '../federation/RemoteApps';
import styles from './RemoteFailuresNotice.module.scss';

/**
 * Names the remotes that are in the manifest but did not load. A remote that is not in the manifest
 * is not listed anywhere, so an app that was never installed stays silent.
 */
export function RemoteFailuresNotice() {
  const { t } = useTranslation('dashboard');
  const failed = useRemoteFailures();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || failed.length === 0) return null;

  return (
    <div className={styles.notice} role="status" data-testid="remote-failures">
      <span className={styles.icon} aria-hidden="true">
        <Icon name="warning" />
      </span>
      <div className={styles.body}>
        <h2 className={styles.title}>{t('remoteFailures.title')}</h2>
        <p className={styles.text}>{t('remoteFailures.body', { apps: failed.join(', ') })}</p>
      </div>
      <Button variant="link" onClick={() => setDismissed(true)}>
        {t('remoteFailures.dismiss')}
      </Button>
    </div>
  );
}
