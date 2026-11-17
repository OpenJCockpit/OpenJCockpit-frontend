import { useTranslation } from '@openjcockpit/i18n';
import { StatusMessage } from '@openjcockpit/ui';
import { STANDARD_POLICIES } from './usePolicyForm';

/** The standard policies the ControlTower backend ships, as documentation. */
export function StandardPolicyList() {
  const { t } = useTranslation('controltower');
  return (
    <>
      <h3>{t('policy.standardTitle')}</h3>
      <StatusMessage>{t('policy.standardHint')}</StatusMessage>
      <ul>
        {STANDARD_POLICIES.map((key) => (
          <li key={key}>
            <b>{t(`policy.standard.${key}.name`)}</b> {t(`policy.standard.${key}.text`)}
          </li>
        ))}
      </ul>
    </>
  );
}
