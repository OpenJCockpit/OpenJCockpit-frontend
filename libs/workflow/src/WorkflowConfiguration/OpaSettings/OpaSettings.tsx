import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checkOpaHealth, getOpaConfig, saveOpaConfig } from '@openjcockpit/api';
import type { OpaConfig } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useSettingsFormLabels, useSettingsResource } from '@openjcockpit/settings';
import {
  StatusChip,
  CheckboxField,
  SecretField,
  SelectField,
  SettingsForm,
  SettingsGroup,
  StatusMessage,
  TextField,
} from '@openjcockpit/ui';
import { OPA_STATUS_KINDS, OPA_STATUS_LABEL_KEYS, opaStatusFor } from './opaStatus';

interface OpaFormState {
  enabled: boolean;
  baseUrl: string;
  policyPath: string;
  healthPath: string;
  timeoutSeconds: string;
  failMode: string;
  decisionLoggingEnabled: boolean;
  decisionLogExportEnabled: boolean;
  environment: string;
  customerLabel: string;
  projectLabel: string;
  authToken: string;
}

function toFormState(config: OpaConfig): OpaFormState {
  return {
    enabled: config.enabled,
    baseUrl: config.baseUrl,
    policyPath: config.policyPath,
    healthPath: config.healthPath,
    timeoutSeconds: String(config.timeoutSeconds),
    failMode: config.failMode,
    decisionLoggingEnabled: config.decisionLoggingEnabled,
    decisionLogExportEnabled: config.decisionLogExportEnabled,
    environment: config.environment,
    customerLabel: config.customerLabel,
    projectLabel: config.projectLabel,
    authToken: '',
  };
}

const OPA_CONFIG_KEY = ['opa-config'];
const OPA_HEALTH_KEY = ['opa-config', 'health'];

export function OpaSettings() {
  const { t } = useTranslation('workflow');
  const labels = useSettingsFormLabels();
  const queryClient = useQueryClient();
  const { draft, setDraft, server, loadError, error, dirty, saving, saved, submit, reset } =
    useSettingsResource({
      queryKey: OPA_CONFIG_KEY,
      load: () => getOpaConfig(),
      save: async (form: OpaFormState) => {
        const result = await saveOpaConfig({
          enabled: form.enabled,
          baseUrl: form.baseUrl,
          policyPath: form.policyPath,
          healthPath: form.healthPath,
          timeoutSeconds: Number(form.timeoutSeconds) || undefined,
          failMode: form.failMode,
          decisionLoggingEnabled: form.decisionLoggingEnabled,
          decisionLogExportEnabled: form.decisionLogExportEnabled,
          environment: form.environment,
          customerLabel: form.customerLabel,
          projectLabel: form.projectLabel,
          authToken: form.authToken || null,
        });
        queryClient.setQueryData(OPA_HEALTH_KEY, await checkOpaHealth());
        return result;
      },
      toDraft: toFormState,
    });
  const healthQuery = useQuery({
    queryKey: OPA_HEALTH_KEY,
    queryFn: () => checkOpaHealth(),
    enabled: server !== undefined,
    staleTime: 0,
  });

  if (loadError) {
    return <StatusMessage variant="error">{t('opa.loadFailed')}</StatusMessage>;
  }
  if (!draft) return <StatusMessage variant="loading">{t('config.loading')}</StatusMessage>;

  const update = (patch: Partial<OpaFormState>) => setDraft({ ...draft, ...patch });
  const status = opaStatusFor(draft.enabled, draft.baseUrl, healthQuery.data ?? null);

  return (
    <SettingsGroup
      title={
        <>
          {t('opa.title')}{' '}
          <StatusChip
            label={t(OPA_STATUS_LABEL_KEYS[status] as never)}
            kind={OPA_STATUS_KINDS[status]}
          />
        </>
      }
      description={t('opa.description')}
    >
      <SettingsForm
        {...labels}
        saveLabel={t('opa.save')}
        savedLabel={t('opa.saved')}
        dirty={dirty}
        saving={saving}
        saved={saved}
        error={error ? t('opa.saveFailed') : null}
        onSubmit={submit}
        onReset={reset}
      >
        <CheckboxField
          label={t('config.enabled')}
          checked={draft.enabled}
          onChange={(v) => update({ enabled: v })}
        />
        <TextField
          label={t('opa.baseUrl')}
          value={draft.baseUrl}
          onChange={(v) => update({ baseUrl: v })}
          placeholder={t('opa.baseUrlPlaceholder')}
        />
        <TextField
          label={t('opa.healthPath')}
          value={draft.healthPath}
          onChange={(v) => update({ healthPath: v })}
          placeholder={t('opa.healthPathPlaceholder')}
        />
        <TextField
          label={t('opa.policyPath')}
          value={draft.policyPath}
          onChange={(v) => update({ policyPath: v })}
          placeholder={t('opa.policyPathPlaceholder')}
        />
        <TextField
          label={t('opa.timeout')}
          type="number"
          min="1"
          value={draft.timeoutSeconds}
          onChange={(v) => update({ timeoutSeconds: v })}
        />
        <SelectField
          label={t('opa.failMode')}
          value={draft.failMode}
          onChange={(v) => update({ failMode: v })}
          options={[
            { value: 'FAIL_CLOSED', label: t('opa.failClosed') },
            { value: 'FAIL_OPEN', label: t('opa.failOpen') },
          ]}
        />
        <TextField
          label={t('opa.environment')}
          value={draft.environment}
          onChange={(v) => update({ environment: v })}
          placeholder={t('opa.environmentPlaceholder')}
        />
        <TextField
          label={t('opa.customer')}
          value={draft.customerLabel}
          onChange={(v) => update({ customerLabel: v })}
          placeholder={t('opa.customerPlaceholder')}
        />
        <TextField
          label={t('opa.projectLabel')}
          value={draft.projectLabel}
          onChange={(v) => update({ projectLabel: v })}
          placeholder={t('opa.projectLabelPlaceholder')}
        />
        <CheckboxField
          label={t('opa.decisionLogging')}
          checked={draft.decisionLoggingEnabled}
          onChange={(v) => update({ decisionLoggingEnabled: v })}
        />
        <CheckboxField
          label={t('opa.decisionLogExport')}
          checked={draft.decisionLogExportEnabled}
          onChange={(v) => update({ decisionLogExportEnabled: v })}
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
