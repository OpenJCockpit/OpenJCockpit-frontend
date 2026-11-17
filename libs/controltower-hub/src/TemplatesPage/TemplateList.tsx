import type { ReactNode } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { EmptyState } from '@openjcockpit/ui';
import { ControlTowerQuery } from '../ControlTowerQuery';

interface Props<T> {
  query: { data?: T[]; isError: boolean; refetch: () => unknown };
  row: (item: T) => ReactNode;
}

/** A template query rendered as rows, with the shared load-failed and empty copy. */
export function TemplateList<T extends { id: string }>({ query, row }: Props<T>) {
  const { t } = useTranslation('controltower');
  return (
    <ControlTowerQuery
      query={query}
      loadFailed={t('templates.loadFailed')}
      isEmpty={(rows) => rows.length === 0}
      empty={<EmptyState title={t('templates.none')} />}
    >
      {(rows) => rows.map(row)}
    </ControlTowerQuery>
  );
}
