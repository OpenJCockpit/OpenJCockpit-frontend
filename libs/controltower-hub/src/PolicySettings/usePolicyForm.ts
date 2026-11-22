import { useState, type FormEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { useReportSettingsDirty } from '@openjcockpit/ui';
import {
  saveControlTowerPolicy,
  testControlTowerPolicy,
  type ControlTowerPolicySettings,
} from '@openjcockpit/api';
import { useGlobalMutation } from '../hooks';
import { useAction } from '../useAction';

/** The policies shipped in the ControlTower repository under infrastructure/opa/policies. */
export const STANDARD_POLICIES = [
  'writerRoles',
  'gitHosts',
  'fourEyes',
  'acceptance',
  'secrets',
  'freeze',
  'dispatchRoles',
] as const;

export const OPA_URL_PLACEHOLDER = 'http://opa:8181';
export const DECISION_PATH_PLACEHOLDER = 'openjcontroltower/decision';

/** Form state, save and connection test of the Open Policy Agent settings. */
export function usePolicyForm(initial: ControlTowerPolicySettings) {
  const { t } = useTranslation('controltower');
  const [policy, setPolicy] = useState<ControlTowerPolicySettings>(initial);
  // What the server holds: the loaded value, then the last saved one.
  const [baseline, setBaseline] = useState(initial);
  const dirty = JSON.stringify(policy) !== JSON.stringify(baseline);
  useReportSettingsDirty(dirty);
  const { run, feedback, pending, clear } = useAction();
  const save = useGlobalMutation(saveControlTowerPolicy);

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
        setBaseline(saved);
        return saved.enabled ? t('policy.savedOn') : t('policy.savedOff');
      },
    );
  }

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

  return {
    policy,
    set,
    onSubmit,
    onTest,
    saving: save.isPending,
    testing: pending && !save.isPending,
    feedback,
    clearFeedback: clear,
  };
}
