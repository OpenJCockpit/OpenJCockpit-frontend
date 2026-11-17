import type { ComponentProps } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { QueryState } from '@openjcockpit/ui';

type Props<T> = Omit<ComponentProps<typeof QueryState<T>>, 'retryLabel' | 'loadingLabel'>;

/** `QueryState` with the shared `retry` and `loading` copy bound, so call sites pass only what differs. */
export function ControlTowerQuery<T>(props: Props<T>) {
  const { t } = useTranslation('controltower');
  return <QueryState<T> retryLabel={t('retry')} loadingLabel={t('loading')} {...props} />;
}
