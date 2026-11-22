import { getDocumentFolderConfig, queryKeys, saveDocumentFolderConfig } from '@openjcockpit/api';
import type { DocumentFolderConfig, Project } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useSettingsFormLabels, useSettingsResource } from '@openjcockpit/settings';
import {
  CheckboxField,
  SettingsForm,
  SettingsGroup,
  StatusMessage,
  TextField,
} from '@openjcockpit/ui';
import {
  DEFAULT_FOLDER_BASE_PATH,
  basePathOf,
  joinFolderPath,
  toCamelCaseFolderName,
} from './folderPath';

interface FolderFormState {
  /** Derived from the stored name or the project name; shown read-only. */
  folderName: string;
  folderBasePath: string;
  fileTriggerEnabled: boolean;
  allowedDocumentTypes: string;
  workflowId: string;
}

interface Props {
  project: Project;
}

const noop = () => {};

function toFormState(folder: DocumentFolderConfig, projectName: string): FolderFormState {
  const loadedPath = folder.folderPath ?? '';
  return {
    folderName: toCamelCaseFolderName(folder.folderName || projectName),
    folderBasePath: loadedPath
      ? basePathOf(loadedPath) || DEFAULT_FOLDER_BASE_PATH
      : DEFAULT_FOLDER_BASE_PATH,
    fileTriggerEnabled: folder.fileTriggerEnabled ?? false,
    allowedDocumentTypes: folder.allowedDocumentTypes ?? '',
    workflowId: folder.workflowId ?? '',
  };
}

export function DocumentFolderSettings({ project }: Props) {
  const { t } = useTranslation('workflow');
  const labels = useSettingsFormLabels();
  const { draft, setDraft, loadError, error, dirty, saving, saved, submit, reset } =
    useSettingsResource({
      queryKey: queryKeys.documentFolderConfig(project.id),
      load: () => getDocumentFolderConfig(project.id),
      save: (form: FolderFormState) =>
        saveDocumentFolderConfig(project.id, {
          folderPath: joinFolderPath(form.folderBasePath, form.folderName),
          fileTriggerEnabled: form.fileTriggerEnabled,
          allowedDocumentTypes: form.allowedDocumentTypes,
          workflowId: form.workflowId,
        }),
      toDraft: (folder) => toFormState(folder, project.name),
    });

  if (loadError) {
    return (
      <StatusMessage variant="error" role="alert">
        {t('documentFolder.loadFailed')}
      </StatusMessage>
    );
  }
  if (!draft) return <StatusMessage variant="loading">{t('config.loading')}</StatusMessage>;

  const folderPath = joinFolderPath(draft.folderBasePath, draft.folderName);
  const update = (patch: Partial<FolderFormState>) => setDraft({ ...draft, ...patch });

  return (
    <SettingsGroup title={t('documentFolder.title')}>
      <SettingsForm
        {...labels}
        saveLabel={t('documentFolder.save')}
        savedLabel={t('documentFolder.saved')}
        dirty={dirty}
        saving={saving}
        saved={saved}
        error={error ? t('documentFolder.saveFailed') : null}
        onSubmit={submit}
        onReset={reset}
      >
        <TextField
          label={t('documentFolder.projectName')}
          value={project.name}
          onChange={noop}
          disabled
        />
        <TextField
          label={t('documentFolder.folderName')}
          value={draft.folderName}
          onChange={noop}
          disabled
        />
        <TextField
          label={t('documentFolder.basePath')}
          value={draft.folderBasePath}
          onChange={(v) => update({ folderBasePath: v })}
          placeholder={t('documentFolder.basePathPlaceholder')}
        />
        <TextField
          label={t('documentFolder.folderPath')}
          value={folderPath}
          onChange={noop}
          disabled
        />
        <TextField
          label={t('documentFolder.types')}
          value={draft.allowedDocumentTypes}
          onChange={(v) => update({ allowedDocumentTypes: v })}
          placeholder={t('documentFolder.typesPlaceholder')}
        />
        <TextField
          label={t('documentFolder.workflowId')}
          value={draft.workflowId}
          onChange={(v) => update({ workflowId: v })}
          placeholder={t('config.workflowIdPlaceholder')}
        />
        <CheckboxField
          label={t('documentFolder.trigger')}
          checked={draft.fileTriggerEnabled}
          onChange={(v) => update({ fileTriggerEnabled: v })}
        />
      </SettingsForm>
    </SettingsGroup>
  );
}
