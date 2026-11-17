import { useState, type FormEvent } from 'react';
import { useSelectedProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  ErrorState,
  Icon,
  LoadingState,
  SecretField,
  SelectField,
  StatusMessage,
  TextField,
  formActionsClass,
  formGridClass,
} from '@openjcockpit/ui';
import {
  checkControlTowerConnection,
  createControlTowerProject,
  updateControlTowerProject,
  type ControlTowerCredentialType,
  type ControlTowerProject,
  type ControlTowerProjectRequest,
} from '@openjcockpit/api';
import { useControlTowerRepository, useRepositoryMutation } from '../hooks';
import { errorMessage } from '../errorMessage';
import { useWriteAccess } from '../useWriteAccess';
import { WithTranslations } from '../registerTranslations';

type Form = Required<Omit<ControlTowerProjectRequest, 'cockpitProjectId'>>;

const GIT_URL_PLACEHOLDER = 'https://github.com/org/repo.git';
const DEFAULT_BRANCH = 'main';

const EMPTY: Form = {
  name: '',
  gitUrl: '',
  defaultBranch: DEFAULT_BRANCH,
  credentialType: 'NONE',
  gitUsername: '',
  secret: '',
  workflowId: '',
};

const fromRepository = (repository: ControlTowerProject): Form => ({
  name: repository.name,
  gitUrl: repository.gitUrl ?? '',
  defaultBranch: repository.defaultBranch,
  credentialType: repository.credentialType,
  gitUsername: repository.gitUsername ?? '',
  secret: '',
  workflowId: repository.workflowId,
});

interface Check {
  ok: boolean;
  message: string;
}

/** The one Git repository of the selected Cockpit project. The secret is write-only: empty on edit keeps the stored one. */
function RepositoryForm({ data }: { data: ControlTowerProject | null }) {
  const { t } = useTranslation('controltower');
  const project = useSelectedProject();
  const canWrite = useWriteAccess();
  const [form, setForm] = useState<Form>(data ? fromRepository(data) : EMPTY);
  const [check, setCheck] = useState<Check | null>(null);
  const [message, setMessage] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const save = useRepositoryMutation(null, (body: ControlTowerProjectRequest) =>
    data ? updateControlTowerProject(data.id, body) : createControlTowerProject(body),
  );

  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setCheck(null);
  };
  const authenticated = form.credentialType !== 'NONE';
  const keepsSecret = !!data?.hasSecret && data.credentialType !== 'NONE';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await save.mutateAsync({
        ...form,
        gitUsername: form.gitUsername || undefined,
        secret: form.secret || undefined,
        cockpitProjectId: project.id,
      });
      setMessage({ ok: true, message: data ? t('repository.saved') : t('repository.registered') });
      setForm((f) => ({ ...f, secret: '' }));
    } catch (e) {
      setMessage({ ok: false, message: errorMessage(e) });
    }
  }

  async function onCheck() {
    setChecking(true);
    setCheck(null);
    try {
      const result = await checkControlTowerConnection({
        gitUrl: form.gitUrl,
        credentialType: form.credentialType,
        gitUsername: form.gitUsername || undefined,
        secret: form.secret || undefined,
        projectId: data?.id,
      });
      setCheck({ ok: result.reachable, message: result.message });
    } catch (e) {
      setCheck({ ok: false, message: errorMessage(e) });
    } finally {
      setChecking(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <StatusMessage>{t('repository.hint', { project: project.name })}</StatusMessage>
      {!canWrite && <StatusMessage>{t('repository.readOnly')}</StatusMessage>}
      <fieldset disabled={!canWrite} className={formGridClass}>
        <TextField
          label={t('repository.name')}
          required
          value={form.name}
          onChange={(name) => set({ name })}
        />
        <TextField
          label={t('repository.gitUrl')}
          required
          type="url"
          value={form.gitUrl}
          onChange={(gitUrl) => set({ gitUrl })}
          placeholder={GIT_URL_PLACEHOLDER}
        />
        <TextField
          label={t('repository.branch')}
          value={form.defaultBranch}
          onChange={(defaultBranch) => set({ defaultBranch })}
          placeholder={DEFAULT_BRANCH}
        />
        <SelectField
          label={t('repository.authentication')}
          value={form.credentialType}
          onChange={(value) => set({ credentialType: value as ControlTowerCredentialType })}
          options={[
            { value: 'NONE', label: t('repository.credential.NONE') },
            { value: 'HTTPS_TOKEN', label: t('repository.credential.HTTPS_TOKEN') },
            { value: 'USERNAME_PASSWORD', label: t('repository.credential.USERNAME_PASSWORD') },
          ]}
        />
        {authenticated && (
          <>
            <TextField
              label={t('repository.username')}
              required={form.credentialType === 'USERNAME_PASSWORD'}
              autoComplete="off"
              value={form.gitUsername}
              onChange={(gitUsername) => set({ gitUsername })}
              hint={
                form.credentialType === 'HTTPS_TOKEN' ? t('repository.usernameHint') : undefined
              }
            />
            <SecretField
              label={
                form.credentialType === 'HTTPS_TOKEN'
                  ? t('repository.token')
                  : t('repository.password')
              }
              hasValue={keepsSecret}
              required={!keepsSecret}
              value={form.secret}
              onChange={(secret) => set({ secret })}
            />
          </>
        )}
        <TextField
          label={t('repository.workflowId')}
          required
          value={form.workflowId}
          onChange={(workflowId) => set({ workflowId })}
        />
      </fieldset>
      {canWrite && (
        <div className={formActionsClass}>
          <Button variant="primary" type="submit" disabled={save.isPending}>
            {data ? t('repository.save') : t('repository.connectAction')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={save.isPending || checking || !form.gitUrl}
            onClick={() => void onCheck()}
          >
            <Icon name={checking ? 'spinner' : 'cloud'} />{' '}
            {checking ? t('repository.checking') : t('repository.check')}
          </Button>
        </div>
      )}
      {check && (
        <StatusMessage role="status" variant={check.ok ? 'info' : 'error'}>
          {check.message}
        </StatusMessage>
      )}
      {message && (
        <StatusMessage
          role={message.ok ? 'status' : 'alert'}
          variant={message.ok ? 'info' : 'error'}
        >
          {message.message}
        </StatusMessage>
      )}
    </form>
  );
}

function LoadedRepositoryForm() {
  const { t } = useTranslation('controltower');
  const { data, isError, refetch } = useControlTowerRepository();
  if (isError) {
    return (
      <ErrorState onRetry={() => void refetch()} retryLabel={t('retry')}>
        {t('repository.loadFailed')}
      </ErrorState>
    );
  }
  if (data === undefined) return <LoadingState>{t('loading')}</LoadingState>;
  // Keyed, so a different repository starts from its own values.
  return <RepositoryForm key={data?.id ?? 'new'} data={data} />;
}

/** Project settings section; the host loads it lazily, so it registers its own translations. */
export default function RepositorySection() {
  return (
    <WithTranslations>
      <LoadedRepositoryForm />
    </WithTranslations>
  );
}
