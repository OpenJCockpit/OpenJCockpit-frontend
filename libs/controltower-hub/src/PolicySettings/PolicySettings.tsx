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
import { errorMessage } from '../errorMessage';
import { useControlTowerSettings, useRepositoryMutation } from '../hooks';
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

interface Status {
  ok: boolean;
  message: string;
  policies?: string[];
}

/** Open Policy Agent settings of the ControlTower backend. The backend lets only administrators save. */
function PolicyForm({ data }: { data: ControlTowerSettingsView }) {
  const { t } = useTranslation('controltower');
  const [policy, setPolicy] = useState<ControlTowerPolicySettings>(data.policy);
  const [status, setStatus] = useState<Status | null>(null);
  const [testing, setTesting] = useState(false);
  const save = useRepositoryMutation(null, saveControlTowerPolicy);

  const editable = data.editable;
  const set = (patch: Partial<ControlTowerPolicySettings>) => {
    setPolicy((p) => ({ ...p, ...patch }));
    setStatus(null);
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    try {
      const saved = await save.mutateAsync(policy);
      setPolicy(saved);
      setStatus({ ok: true, message: saved.enabled ? t('policy.savedOn') : t('policy.savedOff') });
    } catch (e) {
      setStatus({ ok: false, message: errorMessage(e) });
    }
  }

  async function onTest() {
    setTesting(true);
    setStatus(null);
    try {
      const result = await testControlTowerPolicy(policy);
      setStatus({ ok: result.reachable, message: result.message, policies: result.policies });
    } catch (e) {
      setStatus({ ok: false, message: errorMessage(e) });
    } finally {
      setTesting(false);
    }
  }

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
        {status && (
          <StatusMessage
            role={status.ok ? 'status' : 'alert'}
            variant={status.ok ? 'info' : 'error'}
          >
            {status.message}
            {status.policies && status.policies.length > 0 && (
              <small> {t('policy.loaded', { list: status.policies.join(', ') })}</small>
            )}
          </StatusMessage>
        )}
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
