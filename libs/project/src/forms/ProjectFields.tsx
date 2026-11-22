import type { Ref } from 'react';
import type { ProjectRequest } from '@openjcockpit/api';
import { CheckboxField, TextAreaField, TextField } from '@openjcockpit/ui';
import { useTranslation } from '@openjcockpit/i18n';

type Change = (updater: (f: ProjectRequest) => ProjectRequest) => void;

interface GeneralProps {
  form: ProjectRequest;
  onChange: Change;
  nameInvalid: boolean;
  /** Message shown inline under the Name input while `nameInvalid`. */
  nameError?: string | null;
  nameInputRef: Ref<HTMLInputElement>;
}

/** Name, customer, environment, owner and description. Render inside a `formGridClass` grid. */
export function GeneralFields({
  form,
  onChange,
  nameInvalid,
  nameError,
  nameInputRef,
}: GeneralProps) {
  const { t } = useTranslation('project');
  return (
    <>
      <TextField
        label={t('form.name')}
        ref={nameInputRef}
        value={form.name}
        onChange={(v) => onChange((f) => ({ ...f, name: v }))}
        placeholder={t('form.namePlaceholder')}
        required
        error={nameInvalid ? nameError : undefined}
        errorId="project-name-error"
        aria-invalid={nameInvalid ? true : undefined}
        aria-describedby={nameInvalid && !nameError ? 'project-name-error' : undefined}
      />
      <TextField
        label={t('form.customerId')}
        value={form.customerId ?? ''}
        onChange={(v) => onChange((f) => ({ ...f, customerId: v }))}
        placeholder={t('form.customerIdPlaceholder')}
      />
      <TextField
        label={t('form.environment')}
        value={form.environment ?? ''}
        onChange={(v) => onChange((f) => ({ ...f, environment: v }))}
        placeholder={t('form.environmentPlaceholder')}
      />
      <TextField
        label={t('form.owner')}
        value={form.owner ?? ''}
        onChange={(v) => onChange((f) => ({ ...f, owner: v }))}
        placeholder={t('form.ownerPlaceholder')}
      />
      <TextAreaField
        label={t('form.description')}
        wide
        rows={3}
        value={form.description ?? ''}
        onChange={(v) => onChange((f) => ({ ...f, description: v }))}
        placeholder={t('form.descriptionPlaceholder')}
      />
    </>
  );
}

/** Git URL, default branch and the "repository does not exist yet" flag. Render inside a `formGridClass` grid. */
export function RepositoryFields({ form, onChange }: { form: ProjectRequest; onChange: Change }) {
  const { t } = useTranslation('project');
  return (
    <>
      <TextField
        label={t('form.gitUrl')}
        value={form.gitUrl ?? ''}
        onChange={(v) => onChange((f) => ({ ...f, gitUrl: v }))}
        placeholder={t('form.gitUrlPlaceholder')}
      />
      <TextField
        label={t('form.branch')}
        value={form.defaultBranch ?? ''}
        onChange={(v) => onChange((f) => ({ ...f, defaultBranch: v }))}
        placeholder={t('form.branchPlaceholder')}
      />
      <CheckboxField
        label={t('form.newProjectCheckbox')}
        checked={form.newProject === 1}
        // The checked value is passed in, so it is read before any updater runs.
        onChange={(checked) => onChange((f) => ({ ...f, newProject: checked ? 1 : 0 }))}
      />
    </>
  );
}
