import { useTranslation } from '@openjcockpit/i18n';
import { useSettingsFormLabels } from '@openjcockpit/settings';
import {
  Button,
  CheckboxField,
  Icon,
  SettingsForm,
  SettingsGroup,
  StatusMessage,
  TextField,
} from '@openjcockpit/ui';
import type { ControlTowerSettingsView } from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { ActionFeedback } from '../ActionFeedback';
import { useControlTowerSettings } from '../hooks';
import { WithTranslations } from '../registerTranslations';
import styles from '../SettingsLayout.module.scss';
import { StandardPolicyList } from './StandardPolicyList';
import { DECISION_PATH_PLACEHOLDER, OPA_URL_PLACEHOLDER, usePolicyForm } from './usePolicyForm';

/** Open Policy Agent settings of the ControlTower backend. The backend lets only administrators save. */
function PolicyForm({ data }: { data: ControlTowerSettingsView }) {
  const { t } = useTranslation('controltower');
  const labels = useSettingsFormLabels();
  const {
    policy,
    set,
    onSubmit,
    onReset,
    onTest,
    dirty,
    saved,
    saveError,
    saving,
    testing,
    feedback,
    clearFeedback,
  } = usePolicyForm(data.policy);
  const editable = data.editable;

  return (
    <>
      <SettingsGroup description={t('policy.hint')}>
        {!editable && <StatusMessage>{t('policy.readOnly')}</StatusMessage>}
        <SettingsForm
          {...labels}
          saveLabel={t('policy.save')}
          savedLabel={saved ?? ''}
          dirty={editable && dirty}
          saving={saving}
          saved={saved !== null}
          error={saveError}
          onSubmit={() => void onSubmit()}
          onReset={onReset}
        >
          <CheckboxField
            label={t('policy.enforce')}
            checked={policy.enabled}
            disabled={!editable}
            onChange={(enabled) => set({ enabled })}
          />
          <TextField
            label={t('policy.url')}
            required
            type="url"
            disabled={!editable}
            value={policy.url}
            onChange={(url) => set({ url })}
            placeholder={OPA_URL_PLACEHOLDER}
          />
          <TextField
            label={t('policy.decisionPath')}
            required
            disabled={!editable}
            value={policy.decisionPath}
            onChange={(decisionPath) => set({ decisionPath })}
            placeholder={DECISION_PATH_PLACEHOLDER}
          />
          <CheckboxField
            label={t('policy.failOpen')}
            checked={policy.failOpen}
            disabled={!editable}
            onChange={(failOpen) => set({ failOpen })}
          />
          {editable && (
            <div className={styles.fullRow}>
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
          {feedback && (
            <div className={styles.fullRow}>
              <ActionFeedback feedback={feedback} onDismiss={clearFeedback} />
            </div>
          )}
        </SettingsForm>
      </SettingsGroup>
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
