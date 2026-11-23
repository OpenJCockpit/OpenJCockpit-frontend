import { getJiraConfig, queryKeys, saveJiraConfig } from '@openjcockpit/api';
import type { JiraConfig } from '@openjcockpit/api';
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

interface JiraFormState {
  enabled: boolean;
  baseUrl: string;
  projectKey: string;
  /** Read-only: whether the server already holds a token. Not sent on save. */
  hasAuthToken: boolean;
  authToken: string;
  issueTypeMapping: string;
  workflowId: string;
}

interface Props {
  projectId: string;
}

function toFormState(jira: JiraConfig): JiraFormState {
  return {
    enabled: jira.enabled,
    baseUrl: jira.baseUrl ?? '',
    projectKey: jira.projectKey ?? '',
    hasAuthToken: jira.hasAuthToken,
    authToken: '',
    issueTypeMapping: jira.issueTypeMapping ?? '',
    workflowId: jira.workflowId ?? '',
  };
}

export function JiraSettings({ projectId }: Props) {
  const { t } = useTranslation('workflow');
  const labels = useSettingsFormLabels();
  const { draft, setDraft, loadError, error, dirty, saving, saved, submit, reset } =
    useSettingsResource({
      queryKey: queryKeys.jiraConfig(projectId),
      load: () => getJiraConfig(projectId),
      save: (form: JiraFormState) =>
        saveJiraConfig(projectId, {
          enabled: form.enabled,
          baseUrl: form.baseUrl,
          projectKey: form.projectKey,
          authToken: form.authToken || null,
          issueTypeMapping: form.issueTypeMapping,
          workflowId: form.workflowId,
        }),
      toDraft: toFormState,
    });

  if (loadError) {
    return (
      <StatusMessage variant="error" role="alert">
        {t('jira.loadFailed')}
      </StatusMessage>
    );
  }
  if (!draft) return <StatusMessage variant="loading">{t('config.loading')}</StatusMessage>;

  const update = (patch: Partial<JiraFormState>) => setDraft({ ...draft, ...patch });

  return (
    <SettingsGroup title={t('jira.title')}>
      <SettingsForm
        {...labels}
        saveLabel={t('jira.save')}
        savedLabel={t('jira.saved')}
        dirty={dirty}
        saving={saving}
        saved={saved}
        error={error ? t('jira.saveFailed') : null}
        onSubmit={submit}
        onReset={reset}
      >
        <CheckboxField
          label={t('config.enabled')}
          checked={draft.enabled}
          onChange={(v) => update({ enabled: v })}
        />
        <TextField
          label={t('jira.baseUrl')}
          value={draft.baseUrl}
          onChange={(v) => update({ baseUrl: v })}
          placeholder={t('jira.baseUrlPlaceholder')}
        />
        <TextField
          label={t('jira.projectKey')}
          value={draft.projectKey}
          onChange={(v) => update({ projectKey: v })}
          placeholder={t('jira.projectKeyPlaceholder')}
        />
        <TextField
          label={t('jira.issueTypeMapping')}
          value={draft.issueTypeMapping}
          onChange={(v) => update({ issueTypeMapping: v })}
          placeholder={t('jira.issueTypeMappingPlaceholder')}
        />
        <TextField
          label={t('config.workflowIdToStart')}
          value={draft.workflowId}
          onChange={(v) => update({ workflowId: v })}
          placeholder={t('config.workflowIdPlaceholder')}
        />
        <SecretField
          label={t('config.authToken')}
          hasValue={draft.hasAuthToken}
          value={draft.authToken}
          onChange={(v) => update({ authToken: v })}
        />
      </SettingsForm>
    </SettingsGroup>
  );
}
