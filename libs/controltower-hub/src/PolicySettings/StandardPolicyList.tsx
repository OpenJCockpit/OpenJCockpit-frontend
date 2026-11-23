import { useTranslation } from '@openjcockpit/i18n';
import { SettingsGroup } from '@openjcockpit/ui';
import styles from '../SettingsLayout.module.scss';
import { STANDARD_POLICIES } from './usePolicyForm';

/** The standard policies the ControlTower backend ships, as documentation. */
export function StandardPolicyList() {
  const { t } = useTranslation('controltower');
  return (
    <SettingsGroup title={t('policy.standardTitle')} description={t('policy.standardHint')}>
      <ul className={styles.list}>
        {STANDARD_POLICIES.map((key) => (
          <li key={key}>
            <b>{t(`policy.standard.${key}.name`)}</b> {t(`policy.standard.${key}.text`)}
          </li>
        ))}
      </ul>
    </SettingsGroup>
  );
}
