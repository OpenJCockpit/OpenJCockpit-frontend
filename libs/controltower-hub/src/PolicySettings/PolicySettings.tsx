import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  CheckboxField,
  Icon,
  StatusMessage,
  TextField,
  formActionsClass,
  formGridClass,
} from '@openjcockpit/ui';
import type { ControlTowerSettingsView } from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { ActionFeedback } from '../ActionFeedback';
import { useControlTowerSettings } from '../hooks';
import { WithTranslations } from '../registerTranslations';
import { StandardPolicyList } from './StandardPolicyList';
import { DECISION_PATH_PLACEHOLDER, OPA_URL_PLACEHOLDER, usePolicyForm } from './usePolicyForm';

/** Open Policy Agent settings of the ControlTower backend. The backend lets only administrators save. */
function PolicyForm({ data }: { data: ControlTowerSettingsView }) {
  const { t } = useTranslation('controltower');
  const { policy, set, onSubmit, onTest, saving, testing, feedback, clearFeedback } = usePolicyForm(
    data.policy,
  );
  const editable = data.editable;

  return (
    <>
      <form onSubmit={(event) => void onSubmit(event)}>
        <StatusMessage>{t('policy.hint')}</StatusMessage>
        {!editable && <StatusMessage>{t('policy.readOnly')}</StatusMessage>}
        <fieldset disabled={!editable} className={formGridClass}>
          <CheckboxField
            label={t('policy.enforce')}
            checked={policy.enabled}
            onChange={(enabled) => set({ enabled })}
          />
          <TextField
            label={t('policy.url')}
            required
            type="url"
            value={policy.url}
            onChange={(url) => set({ url })}
            placeholder={OPA_URL_PLACEHOLDER}
          />
          <TextField
            label={t('policy.decisionPath')}
            required
            value={policy.decisionPath}
            onChange={(decisionPath) => set({ decisionPath })}
            placeholder={DECISION_PATH_PLACEHOLDER}
          />
          <CheckboxField
            label={t('policy.failOpen')}
            checked={policy.failOpen}
            onChange={(failOpen) => set({ failOpen })}
          />
        </fieldset>
        {editable && (
          <div className={formActionsClass}>
            <Button variant="primary" type="submit" disabled={saving}>
              {t('policy.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={testing || saving || !policy.url || !policy.decisionPath}
              onClick={() => void onTest()}
            >
              <Icon name={testing ? 'spinner' : 'cloud'} /> {t('policy.test')}
            </Button>
          </div>
        )}
        <ActionFeedback feedback={feedback} onDismiss={clearFeedback} />
      </form>
      <StandardPolicyList />
    </>
  );
}

function LoadedPolicyForm() {
  const { t } = useTranslation('controltower');
  const settings = useControlTowerSettings();
  return (
    <ControlTowerQuery query={settings} loadFailed={t('policy.loadFailed')}>
      {(data) => <PolicyForm data={data} />}
    </ControlTowerQuery>
  );
}

/** Settings section; the host loads it lazily, so it registers its own translations. */
export default function PolicySection() {
  return (
    <WithTranslations>
      <LoadedPolicyForm />
    </WithTranslations>
  );
}
