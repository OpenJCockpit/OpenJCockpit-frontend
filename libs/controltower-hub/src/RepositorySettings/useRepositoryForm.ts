import { useState, type FormEvent } from 'react';
import { useSelectedProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import {
  checkControlTowerConnection,
  createControlTowerProject,
  updateControlTowerProject,
  type ControlTowerProject,
  type ControlTowerProjectRequest,
} from '@openjcockpit/api';
import { useGlobalMutation } from '../hooks';
import { useAction } from '../useAction';

export type RepositoryFormValues = Required<Omit<ControlTowerProjectRequest, 'cockpitProjectId'>>;

export const GIT_URL_PLACEHOLDER = 'https://github.com/org/repo.git';
export const DEFAULT_BRANCH = 'main';

const EMPTY: RepositoryFormValues = {
  name: '',
  gitUrl: '',
  defaultBranch: DEFAULT_BRANCH,
  credentialType: 'NONE',
  gitUsername: '',
  secret: '',
  workflowId: '',
};

const fromRepository = (repository: ControlTowerProject): RepositoryFormValues => ({
  name: repository.name,
  gitUrl: repository.gitUrl ?? '',
  defaultBranch: repository.defaultBranch,
  credentialType: repository.credentialType,
  gitUsername: repository.gitUsername ?? '',
  secret: '',
  workflowId: repository.workflowId,
});

/**
 * Form state, save and connection check of the Git repository linked to the selected Cockpit project.
 * `data` is the linked repository, or null while none is linked. The secret is write-only: empty on
 * edit keeps the stored one.
 */
export function useRepositoryForm(data: ControlTowerProject | null) {
  const { t } = useTranslation('controltower');
  const project = useSelectedProject();
  const [form, setForm] = useState<RepositoryFormValues>(data ? fromRepository(data) : EMPTY);
  const check = useAction();
  const submit = useAction();
  const save = useGlobalMutation((body: ControlTowerProjectRequest) =>
    data ? updateControlTowerProject(data.id, body) : createControlTowerProject(body),
  );

  const set = (patch: Partial<RepositoryFormValues>) => {
    setForm((f) => ({ ...f, ...patch }));
    check.clear();
  };

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    return submit.run(
      () =>
        save.mutateAsync({
          ...form,
          gitUsername: form.gitUsername || undefined,
          secret: form.secret || undefined,
          cockpitProjectId: project.id,
        }),
      () => {
        setForm((f) => ({ ...f, secret: '' }));
        return data ? t('repository.saved') : t('repository.registered');
      },
    );
  }

  const onCheck = () =>
    check.run(
      () =>
        checkControlTowerConnection({
          gitUrl: form.gitUrl,
          credentialType: form.credentialType,
          gitUsername: form.gitUsername || undefined,
          secret: form.secret || undefined,
          projectId: data?.id,
        }),
      (result) => ({ ok: result.reachable, message: result.message }),
    );

  return {
    form,
    set,
    onSubmit,
    onCheck,
    saving: save.isPending,
    checking: check.pending,
    checkFeedback: check.feedback,
    submitFeedback: submit.feedback,
    project,
  };
}
