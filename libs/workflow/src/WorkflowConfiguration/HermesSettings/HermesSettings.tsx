import { getHermesConfig, queryKeys, saveHermesConfig } from '@openjcockpit/api';
import type { HermesConfig } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useSettingsFormLabels, useSettingsResource } from '@openjcockpit/settings';
import {
  CheckboxField,
  SecretField,
  SettingsForm,
  SettingsGroup,
  StatusMessage,
  TextField,
} from '@openjcockpit/ui';

interface HermesFormState {
  enabled: boolean;
  endpointUrl: string;
  authToken: string;
  signalType: string;
  workflowId: string;
}

interface Props {
  projectId: string;
}

function toFormState(hermes: HermesConfig): HermesFormState {
  return {
    enabled: hermes.enabled,
    endpointUrl: hermes.endpointUrl ?? '',
    authToken: '',
    signalType: hermes.signalType ?? '',
    workflowId: hermes.workflowId ?? '',
  };
}

export function HermesSettings({ projectId }: Props) {
  const { t } = useTranslation('workflow');
  const labels = useSettingsFormLabels();
  const { draft, setDraft, server, loadError, error, dirty, saving, saved, submit, reset } =
    useSettingsResource({
      queryKey: queryKeys.hermesConfig(projectId),
      load: () => getHermesConfig(projectId),
      save: (form: HermesFormState) =>
        saveHermesConfig(projectId, {
          enabled: form.enabled,
          endpointUrl: form.endpointUrl,
          authToken: form.authToken || null,
          signalType: form.signalType,
          workflowId: form.workflowId,
        }),
      toDraft: toFormState,
    });

  if (loadError) {
    return (
      <StatusMessage variant="error" role="alert">
        {t('hermes.loadFailed')}
      </StatusMessage>
    );
  }
  if (!draft) return <StatusMessage variant="loading">{t('config.loading')}</StatusMessage>;

  const update = (patch: Partial<HermesFormState>) => setDraft({ ...draft, ...patch });

  return (
    <SettingsGroup title={t('hermes.title')}>
      <SettingsForm
        {...labels}
        saveLabel={t('hermes.save')}
        savedLabel={t('hermes.saved')}
        dirty={dirty}
        saving={saving}
        saved={saved}
        error={error ? t('hermes.saveFailed') : null}
        onSubmit={submit}
        onReset={reset}
      >
        <CheckboxField
          label={t('config.enabled')}
          checked={draft.enabled}
          onChange={(v) => update({ enabled: v })}
        />
        <TextField
          label={t('hermes.endpoint')}
          value={draft.endpointUrl}
          onChange={(v) => update({ endpointUrl: v })}
          placeholder={t('hermes.endpointPlaceholder')}
        />
        <TextField
          label={t('hermes.signalType')}
          value={draft.signalType}
          onChange={(v) => update({ signalType: v })}
          placeholder={t('hermes.signalTypePlaceholder')}
        />
        <TextField
          label={t('config.workflowIdToStart')}
          value={draft.workflowId}
          onChange={(v) => update({ workflowId: v })}
          placeholder={t('config.workflowIdPlaceholder')}
        />
        <SecretField
          label={t('config.authToken')}
          hasValue={server?.hasAuthToken === true}
          value={draft.authToken}
          onChange={(v) => update({ authToken: v })}
        />
      </SettingsForm>
    </SettingsGroup>
  );
}
