import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  Icon,
  SelectField,
  StatusMessage,
  TextField,
  fieldErrorClass,
  fieldHintClass,
  formActionsClass,
  formGridClass,
} from '@openjcockpit/ui';
import type { ProjectGitCredentialRequest } from '@openjcockpit/api';
import type { ProjectWizardState } from './useProjectWizard';
import styles from './ProjectWizard.module.scss';

const CREDENTIAL_TYPES = [
  'NONE',
  'HTTPS_TOKEN',
  'GITHUB_PAT',
  'USERNAME_PASSWORD',
  'GITHUB_APP',
] as const;

export function RepositoryStep({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  const { form, credentials, errors, testResult } = wizard;
  const status = testResult?.gitStatus;
  return (
    <>
      <div className={formGridClass}>
        <SelectField
          label={t('wizard.repository.mode')}
          value={wizard.mode}
          onChange={(v) => wizard.chooseMode(v === 'new' ? 'new' : 'existing')}
          options={[
            { value: 'existing', label: t('wizard.repository.existing') },
            { value: 'new', label: t('wizard.repository.new') },
          ]}
        />
        {wizard.isNewRepo ? (
          <p className={fieldHintClass}>{t('wizard.repository.newHint')}</p>
        ) : (
          <>
            <TextField
              label={t('form.gitUrl')}
              value={form.gitUrl}
              onChange={(v) => wizard.updateForm((f) => ({ ...f, gitUrl: v }))}
              placeholder={t('form.gitUrlPlaceholder')}
              required
              error={errors.gitUrl}
              errorId="project-git-url-error"
              aria-invalid={errors.gitUrl ? true : undefined}
            />
            <TextField
              label={t('form.branch')}
              value={form.defaultBranch}
              onChange={(v) => wizard.updateForm((f) => ({ ...f, defaultBranch: v }))}
              placeholder={t('form.branchPlaceholder')}
            />
            <SelectField
              label={t('credentials.type')}
              value={credentials.credentialType}
              onChange={(v) =>
                wizard.updateCredentials((c) => ({
                  ...c,
                  credentialType: v as ProjectGitCredentialRequest['credentialType'],
                }))
              }
              options={CREDENTIAL_TYPES.map((type) => ({
                value: type,
                label: t(`credentials.types.${type}`),
              }))}
            />
            <TextField
              label={t('credentials.username')}
              value={credentials.username}
              onChange={(v) => wizard.updateCredentials((c) => ({ ...c, username: v }))}
              placeholder={t('credentials.usernamePlaceholder')}
            />
            <TextField
              label={t('credentials.secret')}
              type="password"
              autoComplete="new-password"
              value={credentials.secret}
              onChange={(v) => wizard.updateCredentials((c) => ({ ...c, secret: v }))}
            />
            <TextField
              label={t('credentials.githubApiUrl')}
              value={credentials.githubApiUrl}
              onChange={(v) => wizard.updateCredentials((c) => ({ ...c, githubApiUrl: v }))}
              placeholder={t('credentials.githubApiUrlPlaceholder')}
            />
          </>
        )}
      </div>
      {!wizard.isNewRepo && (
        <>
          <div className={formActionsClass}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void wizard.testConnection()}
              disabled={wizard.testing}
            >
              {wizard.testing && <Icon name="spinner" />} {t('wizard.repository.test')}
            </Button>
          </div>
          <div aria-live="polite">
            {status === 'ACCESSIBLE' && (
              <StatusMessage>{t('wizard.repository.testOk')}</StatusMessage>
            )}
            {status && status !== 'ACCESSIBLE' && (
              <p role="alert" className={fieldErrorClass}>
                {testResult?.message || t('wizard.repository.testNotReachable')}
              </p>
            )}
            {wizard.testError && (
              <p role="alert" className={fieldErrorClass}>
                {wizard.testError}
              </p>
            )}
            {!!testResult?.warnings.length && (
              <ul className={styles.warnings}>
                {testResult.warnings.map((warning) => (
                  <li key={warning} className={fieldHintClass}>
                    {t(`wizard.repository.warnings.${warning}`, {
                      defaultValue: t('wizard.repository.warnings.unknown'),
                    })}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className={fieldHintClass}>{t('wizard.repository.testHint')}</p>
        </>
      )}
    </>
  );
}
