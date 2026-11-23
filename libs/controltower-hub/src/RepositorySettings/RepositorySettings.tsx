import { useTranslation } from '@openjcockpit/i18n';
import { useSettingsFormLabels } from '@openjcockpit/settings';
import { Button, Icon, SettingsForm, SettingsGroup, StatusMessage } from '@openjcockpit/ui';
import type { ControlTowerProject } from '@openjcockpit/api';
import { useControlTowerRepository } from '../hooks';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { ActionFeedback } from '../ActionFeedback';
import { useWriteAccess } from '../useWriteAccess';
import { WithTranslations } from '../registerTranslations';
import styles from '../SettingsLayout.module.scss';
import { RepositoryFields } from './RepositoryFields';
import { useRepositoryForm } from './useRepositoryForm';

/** The one Git repository of the selected Cockpit project. */
function RepositoryForm({ data }: { data: ControlTowerProject | null }) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const {
    form,
    set,
    onSubmit,
    onReset,
    onCheck,
    dirty,
    saved,
    saveError,
    saving,
    checking,
    checkFeedback,
    project,
    clearCheckFeedback,
  } = useRepositoryForm(data);
  const labels = useSettingsFormLabels();
  const keepsSecret = !!data?.hasSecret && data.credentialType !== 'NONE';

  return (
    <SettingsGroup description={t('repository.hint', { project: project.name })}>
      {!canWrite && <StatusMessage>{t('repository.readOnly')}</StatusMessage>}
      <SettingsForm
        {...labels}
        saveLabel={data ? t('repository.save') : t('repository.connectAction')}
        savedLabel={saved ?? ''}
        dirty={canWrite && dirty}
        saving={saving}
        saved={saved !== null}
        error={saveError}
        onSubmit={() => void onSubmit()}
        onReset={onReset}
      >
        <RepositoryFields
          form={form}
          disabled={!canWrite}
          hasStoredSecret={keepsSecret}
          onChange={set}
        />
        {canWrite && (
          <div className={styles.fullRow}>
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
        {checkFeedback && (
          <div className={styles.fullRow}>
            <ActionFeedback feedback={checkFeedback} onDismiss={clearCheckFeedback} />
          </div>
        )}
      </SettingsForm>
    </SettingsGroup>
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
