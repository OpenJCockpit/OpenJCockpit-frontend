import { useTranslation } from '@openjcockpit/i18n';
import { Button, Icon, StatusMessage, formActionsClass } from '@openjcockpit/ui';
import type { ControlTowerProject } from '@openjcockpit/api';
import { useControlTowerRepository } from '../hooks';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { ActionFeedback } from '../ActionFeedback';
import { useWriteAccess } from '../useWriteAccess';
import { WithTranslations } from '../registerTranslations';
import { RepositoryFields } from './RepositoryFields';
import { useRepositoryForm } from './useRepositoryForm';

/** The one Git repository of the selected Cockpit project. */
function RepositoryForm({ data }: { data: ControlTowerProject | null }) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const { form, set, onSubmit, onCheck, saving, checking, checkFeedback, submitFeedback, project } =
    useRepositoryForm(data);
  const keepsSecret = !!data?.hasSecret && data.credentialType !== 'NONE';

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <StatusMessage>{t('repository.hint', { project: project.name })}</StatusMessage>
      {!canWrite && <StatusMessage>{t('repository.readOnly')}</StatusMessage>}
      <RepositoryFields
        form={form}
        disabled={!canWrite}
        hasStoredSecret={keepsSecret}
        onChange={set}
      />
      {canWrite && (
        <div className={formActionsClass}>
          <Button variant="primary" type="submit" disabled={saving}>
            {data ? t('repository.save') : t('repository.connectAction')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving || checking || !form.gitUrl}
            onClick={() => void onCheck()}
          >
            <Icon name={checking ? 'spinner' : 'cloud'} />{' '}
            {checking ? t('repository.checking') : t('repository.check')}
          </Button>
        </div>
      )}
      <ActionFeedback feedback={checkFeedback} />
      <ActionFeedback feedback={submitFeedback} />
    </form>
  );
}

function LoadedRepositoryForm() {
  const { t } = useTranslation('controltower');
  const repository = useControlTowerRepository();
  // Keyed, so a different repository starts from its own values.
  return (
    <ControlTowerQuery
      query={repository}
      loadFailed={t('repository.loadFailed')}
      none={<RepositoryForm key="new" data={null} />}
    >
      {(data) => <RepositoryForm key={data.id} data={data} />}
    </ControlTowerQuery>
  );
}

/** Project settings section; the host loads it lazily, so it registers its own translations. */
export default function RepositorySection() {
  return (
    <WithTranslations>
      <LoadedRepositoryForm />
    </WithTranslations>
  );
}
