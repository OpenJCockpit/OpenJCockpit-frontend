import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  EmptyState,
  buttonClass,
  ListRow,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  StatusChip,
} from '@openjcockpit/ui';
import type { ControlTowerQueueCandidate, ControlTowerSpec } from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { CONTROLTOWER_SPECS_PATH, specPath } from '../routePaths';
import { deriveBlockers } from '../specGraph';
import styles from './QueuePage.module.scss';

interface Props {
  query: { data?: ControlTowerQueueCandidate[]; isError: boolean; refetch: () => unknown };
  /** All specs; the approved ones that are not ready are listed with what they wait on. */
  specs?: ControlTowerSpec[];
}

/** Approved specs that are not in the ready queue, each with the predecessors it waits on. */
function waitingSpecs(ready: ControlTowerQueueCandidate[], specs: ControlTowerSpec[]) {
  const readyIds = new Set(ready.map((c) => c.specId));
  const blockers = deriveBlockers(specs);
  const titles = new Map(specs.map((s) => [s.id, s.title]));
  return specs
    .filter((s) => s.status === 'APPROVED' && !readyIds.has(s.id))
    .map((spec) => {
      const b = blockers.get(spec.id);
      const ids = [...(b?.blockedBy ?? []), ...(b?.missing ?? [])];
      return { spec, predecessors: ids.map((id) => ({ id, title: titles.get(id) ?? id })) };
    });
}

/** The specs that are ready to be dispatched, in queue order. */
export function QueueList({ query, specs }: Props) {
  const { t } = useTranslation('controltower');
  const data = query.data;
  const waiting = data && specs ? waitingSpecs(data, specs) : [];
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('queue.ready')}</PanelTitle>
        {data && <StatusChip label={t('queue.count', { count: data.length })} kind="neutral" />}
      </PanelHeader>
      <PanelBody>
        <ControlTowerQuery
          query={query}
          loadFailed={t('queue.loadFailed')}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title={t('queue.empty')}
              action={
                <Link
                  className={buttonClass({ variant: 'secondary' })}
                  to={CONTROLTOWER_SPECS_PATH}
                >
                  {t('queue.emptyAction')}
                </Link>
              }
            />
          }
        >
          {(rows) =>
            rows.map((candidate, index) => (
              <ListRow key={candidate.specId}>
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
              </ListRow>
            ))
          }
        </ControlTowerQuery>
        {waiting.length > 0 && (
          <section aria-labelledby="queue-waiting">
            <h3 id="queue-waiting">{t('queue.waiting')}</h3>
            {waiting.map(({ spec, predecessors }) => (
              <ListRow key={spec.id}>
                <div className={styles.grow}>
                  <b>{spec.title}</b>
                  <small>{spec.specPath}</small>
                  {predecessors.length > 0 && (
                    <small>
                      {t('queue.blockedBy')}{' '}
                      {predecessors.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ', '}
                          <Link to={specPath(p.id)}>{p.title}</Link>
                        </span>
                      ))}
                    </small>
                  )}
                </div>
              </ListRow>
            ))}
          </section>
        )}
      </PanelBody>
    </Panel>
  );
}
