import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { HubPage, Panel, QueryState } from '@openjcockpit/ui';
import { useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { GroupedTimeline } from '../EvidenceTimeline/GroupedTimeline';
import { RunList } from '../RunList/RunList';
import { RunSummary } from '../RunSummary/RunSummary';
import { useEvidenceRun } from '../useEvidenceRun';
import { useEvidenceRuns } from '../useEvidenceRuns';
import styles from './EvidencePage.module.scss';

interface Props {
  onBack: () => void;
  /** Replaces the default back-button header, e.g. with the host's shared top menu. */
  header?: ReactNode;
}

function SelectedRun({ runId }: { runId: string }) {
  const { t } = useTranslation('evidence');
  const run = useEvidenceRun(runId);
  return (
    <QueryState
      query={run}
      loadFailed={t('failed')}
      retryLabel={t('retry')}
      loadingLabel={t('loading')}
    >
      {(data) => (
        <>
          <Panel as="section">
            <RunSummary details={data.details} />
          </Panel>
          <Panel as="section">
            {data.events.length === 0 ? (
              <p className={styles.empty}>{t('noEvents')}</p>
            ) : (
              <GroupedTimeline events={data.events} />
            )}
          </Panel>
        </>
      )}
    </QueryState>
  );
}

/** Past runs of the project plus the selected run (`?run=<runId>`, default the latest). */
export function EvidencePage({ onBack, header }: Props) {
  const { t } = useTranslation('evidence');
  const project = useHubProject().selected;
  const runs = useEvidenceRuns();
  const [params, setParams] = useSearchParams();

  const items = runs.data?.pages.flatMap((page) => page.items) ?? [];
  const requested = params.get('run');
  const selectedRunId = requested ?? items[0]?.runId ?? '';

  return (
    <HubPage
      eyebrow={t('title')}
      title={project?.name}
      header={header}
      onBack={onBack}
      backTitle={t('back')}
    >
      <QueryState
        query={runs}
        loadFailed={t('failed')}
        retryLabel={t('retry')}
        loadingLabel={t('loading')}
        isEmpty={(data) => data.pages[0]?.items.length === 0}
        empty={<p className={styles.empty}>{t('noRuns')}</p>}
      >
        {() => (
          <div className={styles.layout}>
            <Panel as="aside" className={styles.rail}>
              <RunList
                runs={items}
                selectedRunId={selectedRunId}
                onSelect={(runId) => setParams({ run: runId }, { replace: true })}
                hasMore={!!runs.hasNextPage}
                loadingMore={runs.isFetchingNextPage}
                onLoadMore={() => void runs.fetchNextPage()}
              />
            </Panel>
            <div className={styles.detail}>
              <SelectedRun runId={selectedRunId} key={selectedRunId} />
            </div>
          </div>
        )}
      </QueryState>
    </HubPage>
  );
}
