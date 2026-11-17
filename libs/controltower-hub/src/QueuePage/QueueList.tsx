import { useTranslation } from '@openjcockpit/i18n';
import { EmptyState, Panel, PanelHeader, PanelTitle, StatusChip } from '@openjcockpit/ui';
import type { ControlTowerQueueCandidate } from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import common from '../shared.module.scss';
import styles from './QueuePage.module.scss';

interface Props {
  query: { data?: ControlTowerQueueCandidate[]; isError: boolean; refetch: () => unknown };
}

/** The specs that are ready to be dispatched, in queue order. */
export function QueueList({ query }: Props) {
  const { t } = useTranslation('controltower');
  const data = query.data;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('queue.ready')}</PanelTitle>
        {data && <StatusChip label={t('queue.count', { count: data.length })} kind="neutral" />}
      </PanelHeader>
      <div className={common.body}>
        <ControlTowerQuery
          query={query}
          loadFailed={t('queue.loadFailed')}
          isEmpty={(rows) => rows.length === 0}
          empty={<EmptyState title={t('queue.empty')} />}
        >
          {(rows) =>
            rows.map((candidate, index) => (
              <div className={common.row} key={candidate.specId}>
                <span className={styles.queueIndex}>{index + 1}</span>
                <div className={styles.grow}>
                  <b>{candidate.title}</b>
                  <small>{candidate.path}</small>
                  <small>
                    {t('queue.priority', {
                      priority: candidate.priority,
                      reason: candidate.reason,
                    })}
                  </small>
                </div>
              </div>
            ))
          }
        </ControlTowerQuery>
      </div>
    </Panel>
  );
}
