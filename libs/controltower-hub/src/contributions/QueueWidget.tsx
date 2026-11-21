import { Link } from 'react-router';
import { isServiceUnavailable } from '@openjcockpit/api';
import { useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { ErrorState, LoadingState, StatusMessage } from '@openjcockpit/ui';
import { useOptionalControlTowerRepository, useQueueProposal } from '../hooks';
import { WithTranslations } from '../registerTranslations';
import { CONTROLTOWER_QUEUE_PATH } from '../routePaths';

function QueueCount() {
  const { t } = useTranslation('controltower');
  const cockpitProjectId = useHubProject().selected?.id ?? null;
  // Same cache entries as the pages, so a dispatch refreshes the widget too.
  const repository = useOptionalControlTowerRepository();
  const queue = useQueueProposal(repository.data?.id ?? null);

  if (cockpitProjectId === null) {
    return (
      <StatusMessage data-testid="controltower-widget-no-project">{t('noProject')}</StatusMessage>
    );
  }
  if (
    (repository.isError && isServiceUnavailable(repository.error)) ||
    (queue.isError && isServiceUnavailable(queue.error))
  ) {
    return (
      <StatusMessage data-testid="controltower-widget-unavailable">
        {t('unavailable.title')}
      </StatusMessage>
    );
  }
  if (repository.isError || queue.isError) {
    return (
      <ErrorState
        onRetry={() => void (repository.isError ? repository.refetch() : queue.refetch())}
        retryLabel={t('retry')}
      >
        {t('queue.loadFailed')}
      </ErrorState>
    );
  }
  if (repository.data === null) return <StatusMessage>{t('widget.noRepository')}</StatusMessage>;
  if (!queue.data) return <LoadingState>{t('loading')}</LoadingState>;
  return (
    <p>
      <Link to={CONTROLTOWER_QUEUE_PATH}>
        <strong>{queue.data.length}</strong> {t('widget.ready', { count: queue.data.length })}
      </Link>
    </p>
  );
}

/** Home widget "Ready to dispatch": how many specs of the selected project can go out now. */
export default function QueueWidget() {
  return (
    <WithTranslations>
      <QueueCount />
    </WithTranslations>
  );
}
