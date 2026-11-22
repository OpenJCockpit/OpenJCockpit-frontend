import { useSelectedProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { useSettingsFormLabels } from '@openjcockpit/settings';
import {
  Button,
  Icon,
  SettingsForm,
  SettingsGroup,
  fieldErrorClass,
  fieldHintClass,
  formActionsClass,
  useConfirmDialog,
} from '@openjcockpit/ui';
import { CredentialsForm } from '../forms/CredentialsForm';
import { RepositoryFields } from '../forms/ProjectFields';
import { GitStatusBadge } from '../GitStatusBadge/GitStatusBadge';
import { WithTranslations } from '../registerTranslations';
import { useGitCheck } from '../useGitCheck';
import { useGitCredentials } from '../useGitCredentials';
import { useProjectDetails } from '../useProjectDetails';
import styles from './RepositorySettings.module.scss';

/** Git URL and branch, the result of the Git check and the stored credentials of the selected project. */
export function RepositorySettings() {
  const { t } = useTranslation('project');
  const project = useSelectedProject();
  const details = useProjectDetails(project);
  const gitCheck = useGitCheck(project.id);
  const credentials = useGitCredentials(project.id);
  const { confirm, dialog } = useConfirmDialog();
  const labels = useSettingsFormLabels();

  return (
    <div className={styles.stack}>
      <SettingsGroup>
        <SettingsForm
          {...labels}
          savingLabel={t('form.saving')}
          savedLabel={t('general.saved')}
          dirty={details.dirty}
          saving={details.saving}
          saved={details.saved}
          error={details.error}
          onSubmit={() => void details.save()}
          onReset={details.reset}
        >
          <RepositoryFields form={details.form} onChange={details.setForm} />
        </SettingsForm>
      </SettingsGroup>

      <SettingsGroup title={t('repository.statusTitle')}>
        <GitStatusBadge status={project.gitStatus} />
        {project.gitStatusMessage && (
          <span className={fieldHintClass}>{project.gitStatusMessage}</span>
        )}
        {gitCheck.error && (
          <p role="alert" className={fieldErrorClass}>
            {gitCheck.error}
          </p>
        )}
        <div className={formActionsClass}>
          <Button
            variant="secondary"
            onClick={() => void gitCheck.check()}
            disabled={gitCheck.checking}
          >
            {gitCheck.checking && <Icon name="spinner" />} {t('list.gitCheck')}
          </Button>
        </div>
      </SettingsGroup>

      {credentials.error && (
        <p role="alert" className={fieldErrorClass}>
          {credentials.error}
        </p>
      )}
      <CredentialsForm
        form={credentials.form}
        onChange={credentials.setForm}
        hasSecret={credentials.hasSecret}
        loading={credentials.loading}
        saving={credentials.saving}
        onSave={() => void credentials.save()}
      />
      {project.hasCredentials && (
        <div className={formActionsClass}>
          <Button
            variant="danger"
            onClick={() =>
              confirm({
                title: t('confirm.deleteCredentials.title', { name: project.name }),
                message: t('confirm.deleteCredentials.message'),
                confirmLabel: t('confirm.deleteCredentials.confirm'),
                cancelLabel: t('confirm.cancel'),
                busyLabel: t('confirm.working'),
                onConfirm: credentials.remove,
              })
            }
          >
            {t('list.deleteCredentials')}
          </Button>
        </div>
      )}
      {dialog}
    </div>
  );
}

export default function RepositorySettingsSection() {
  return (
    <WithTranslations>
      <RepositorySettings />
    </WithTranslations>
  );
}
