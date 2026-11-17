import { useState, type FormEvent } from 'react';
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
import {
  saveControlTowerPolicy,
  testControlTowerPolicy,
  type ControlTowerPolicySettings,
  type ControlTowerSettingsView,
} from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { ActionFeedback } from '../ActionFeedback';
import { useAction } from '../useAction';
import { useControlTowerSettings, useGlobalMutation } from '../hooks';
import { WithTranslations } from '../registerTranslations';

/** The policies shipped in the ControlTower repository under infrastructure/opa/policies. */
const STANDARD_POLICIES = [
  'writerRoles',
  'gitHosts',
  'fourEyes',
  'acceptance',
  'secrets',
  'freeze',
  'dispatchRoles',
] as const;

const OPA_URL_PLACEHOLDER = 'http://opa:8181';
const DECISION_PATH_PLACEHOLDER = 'openjcontroltower/decision';

/** Open Policy Agent settings of the ControlTower backend. The backend lets only administrators save. */
function PolicyForm({ data }: { data: ControlTowerSettingsView }) {
  const { t } = useTranslation('controltower');
  const [policy, setPolicy] = useState<ControlTowerPolicySettings>(data.policy);
  const { run, feedback, pending, clear } = useAction();
  const save = useGlobalMutation(saveControlTowerPolicy);

  const editable = data.editable;
  const set = (patch: Partial<ControlTowerPolicySettings>) => {
    setPolicy((p) => ({ ...p, ...patch }));
    clear();
  };

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    return run(
      () => save.mutateAsync(policy),
      (saved) => {
        setPolicy(saved);
        return saved.enabled ? t('policy.savedOn') : t('policy.savedOff');
      },
    );
  }

  const testing = pending && !save.isPending;
  const onTest = () =>
    run(
      () => testControlTowerPolicy(policy),
      (result) => ({
        ok: result.reachable,
        message: result.message,
        detail: result.policies?.length
          ? t('policy.loaded', { list: result.policies.join(', ') })
          : undefined,
      }),
    );

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
            <Button variant="primary" type="submit" disabled={save.isPending}>
              {t('policy.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={testing || save.isPending || !policy.url || !policy.decisionPath}
              onClick={() => void onTest()}
            >
              <Icon name={testing ? 'spinner' : 'cloud'} /> {t('policy.test')}
            </Button>
          </div>
        )}
        <ActionFeedback feedback={feedback} />
      </form>
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
