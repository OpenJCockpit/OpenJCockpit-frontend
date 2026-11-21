import type { ComponentProps } from 'react';
import { isServiceUnavailable } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { Button, EmptyState, QueryState } from '@openjcockpit/ui';

type QueryProps<T> = ComponentProps<typeof QueryState<T>>;
type Props<T> = Omit<QueryProps<T>, 'retryLabel' | 'loadingLabel' | 'query'> & {
  query: QueryProps<T>['query'] & { error?: unknown };
};

/** One empty state for "the Control Tower backend is down", instead of each page's own load-failed text. */
export function ControlTowerUnavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('controltower');
  return (
    <EmptyState
      title={t('unavailable.title')}
      hint={t('unavailable.hint')}
      action={
        <Button variant="secondary" onClick={onRetry}>
          {t('retry')}
        </Button>
      }
    />
  );
}

/**
 * `QueryState` with the shared `retry` and `loading` copy bound, so call sites pass only what differs.
 * A failed load because the backend is unreachable shows `ControlTowerUnavailable`.
 */
export function ControlTowerQuery<T>(props: Props<T>) {
  const { t } = useTranslation('controltower');
  const { query } = props;
  if (query.data == null && query.isError && isServiceUnavailable(query.error)) {
    return <ControlTowerUnavailable onRetry={() => void query.refetch()} />;
  }
  return <QueryState<T> retryLabel={t('retry')} loadingLabel={t('loading')} {...props} />;
}
