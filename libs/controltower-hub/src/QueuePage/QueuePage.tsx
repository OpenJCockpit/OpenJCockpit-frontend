import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  buttonClass,
  CheckboxField,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  PanelHeader,
  PanelTitle,
  StatusChip,
  StatusMessage,
} from '@openjcockpit/ui';
import { dispatchControlTowerSpecs, type ControlTowerDispatchOutcome } from '@openjcockpit/api';
import { useQueueProposal, useRepositoryMutation } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { SPEC_QUEUE_PATH } from '../routePaths';
import { useWriteAccess } from '../useWriteAccess';
import common from '../shared.module.scss';
import styles from './QueuePage.module.scss';

/** The specs that may be sent to OpenJCockpit now, and the opt-in dispatch. */
export function QueuePage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const canWrite = useWriteAccess();
  const { data, isError, refetch } = useQueueProposal(repository.id);
  const [published, setPublished] = useState(false);
  const [outcomes, setOutcomes] = useState<ControlTowerDispatchOutcome[] | null>(null);
  const dispatch = useRepositoryMutation(repository.id, () =>
    dispatchControlTowerSpecs(repository.id, published),
  );

  let ready;
  if (data) {
    ready = data.length ? (
      data.map((candidate, index) => (
        <div className={common.row} key={candidate.specId}>
          <span className={styles.queueIndex}>{index + 1}</span>
          <div className={styles.grow}>
            <b>{candidate.title}</b>
            <small>{candidate.path}</small>
            <small>
              {t('queue.priority', { priority: candidate.priority, reason: candidate.reason })}
            </small>
          </div>
        </div>
      ))
    ) : (
      <EmptyState title={t('queue.empty')} />
    );
  } else if (isError) {
    ready = (
      <ErrorState onRetry={() => void refetch()} retryLabel={t('retry')}>
        {t('queue.loadFailed')}
      </ErrorState>
    );
  } else {
    ready = <LoadingState>{t('loading')}</LoadingState>;
  }

  return (
    <div className={common.twoCol}>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('queue.ready')}</PanelTitle>
          {data && <StatusChip label={t('queue.count', { count: data.length })} kind="neutral" />}
        </PanelHeader>
        <div className={common.body}>{ready}</div>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('queue.dispatchTitle')}</PanelTitle>
        </PanelHeader>
        <div className={common.body}>
          <StatusMessage>{t('queue.hint')}</StatusMessage>
          {canWrite && (
            <>
              <CheckboxField
                label={t('queue.published')}
                checked={published}
                onChange={setPublished}
              />
              <div className={common.actions}>
                <Button
                  variant="primary"
                  disabled={dispatch.isPending || !published || !data?.length}
                  onClick={() => {
                    setOutcomes(null);
                    dispatch.mutate(undefined, { onSuccess: setOutcomes });
                  }}
                >
                  {t('queue.dispatch')}
                </Button>
              </div>
            </>
          )}
          {dispatch.isError && (
            <StatusMessage variant="error" role="alert">
              {dispatch.error.message}
            </StatusMessage>
          )}
          {outcomes && (
            <div role="status">
              <p>
                {outcomes
                  .map((o) => t(`queue.result.${o.result}`, { defaultValue: o.result }))
                  .join(', ')}
              </p>
              <Link className={buttonClass({ variant: 'secondary' })} to={SPEC_QUEUE_PATH}>
                {t('queue.openSpecQueue')}
              </Link>
            </div>
          )}
          <StatusMessage>{t('queue.unknownHint')}</StatusMessage>
        </div>
      </Panel>
    </div>
  );
}
