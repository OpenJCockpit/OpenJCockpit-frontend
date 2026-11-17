import { useTranslation } from '@openjcockpit/i18n';
import { TextField, formGridClass } from '@openjcockpit/ui';
import { GitCredentialFields } from './GitCredentialFields';
import {
  DEFAULT_BRANCH,
  GIT_URL_PLACEHOLDER,
  type RepositoryFormValues,
} from './useRepositoryForm';

interface Props {
  form: RepositoryFormValues;
  disabled: boolean;
  hasStoredSecret: boolean;
  onChange: (patch: Partial<RepositoryFormValues>) => void;
}

/** The input fields of the repository form. */
export function RepositoryFields({ form, disabled, hasStoredSecret, onChange }: Props) {
  const { t } = useTranslation('controltower');
  return (
    <fieldset disabled={disabled} className={formGridClass}>
      <TextField
        label={t('repository.name')}
        required
        value={form.name}
        onChange={(name) => onChange({ name })}
      />
      <TextField
        label={t('repository.gitUrl')}
        required
        type="url"
        value={form.gitUrl}
        onChange={(gitUrl) => onChange({ gitUrl })}
        placeholder={GIT_URL_PLACEHOLDER}
      />
      <TextField
        label={t('repository.branch')}
        value={form.defaultBranch}
        onChange={(defaultBranch) => onChange({ defaultBranch })}
        placeholder={DEFAULT_BRANCH}
      />
      <GitCredentialFields
        credentialType={form.credentialType}
        gitUsername={form.gitUsername}
        secret={form.secret}
        hasStoredSecret={hasStoredSecret}
        onChange={onChange}
      />
      <TextField
        label={t('repository.workflowId')}
        required
        value={form.workflowId}
        onChange={(workflowId) => onChange({ workflowId })}
      />
    </fieldset>
  );
}
