import type { ReactNode } from 'react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, HubPage, Icon, Panel, QueryState } from '@openjcockpit/ui';
import { useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { EvidenceFilters } from '../EvidenceFilters/EvidenceFilters';
import { filterEvents, isFiltering, NO_FILTER } from '../eventFilter';
import { RunOutcome } from '../RunOutcome/RunOutcome';
import { GroupedTimeline } from '../EvidenceTimeline/GroupedTimeline';
import { ExportMenu } from '../ExportMenu/ExportMenu';
import { RunSummary } from '../RunSummary/RunSummary';
import { useEvidenceRun } from '../useEvidenceRun';
import { useExportEvidenceRun } from '../useExportEvidenceRun';
import styles from './EvidenceDetailPage.module.scss';

interface Props {
  onBack: () => void;
  /** Replaces the default back-button header, e.g. with the host's shared top menu. */
  header?: ReactNode;
}

function RunDetail({ runId }: { runId: string }) {
  const { t } = useTranslation('evidence');
  const gitUrl = useHubProject().selected?.gitUrl;
  const run = useEvidenceRun(runId);
  const exportRun = useExportEvidenceRun(runId);
  const [filter, setFilter] = useState(NO_FILTER);
  return (
    <QueryState
      query={run}
      loadFailed={t('failed')}
      retryLabel={t('retry')}
      loadingLabel={t('loading')}
    >
      {(data) => {
        const visible = filterEvents(data.events, filter);
        return (
          <>
            <Panel as="section">
              <div className={styles.actions}>
                <ExportMenu
                  label={t('export.scope.run')}
                  pending={exportRun.isPending}
                  error={exportRun.isError}
                  onExport={(format, includeOutputs) =>
                    exportRun.mutate({ format, includeOutputs })
                  }
                />
              </div>
              <RunSummary details={data.details} gitUrl={gitUrl} />
              <RunOutcome details={data.details} />
            </Panel>
            <Panel as="section">
              {data.events.length === 0 ? (
                <p className={styles.empty}>{t('noEvents')}</p>
              ) : (
                <>
                  <EvidenceFilters filter={filter} onChange={setFilter} />
                  {visible.length === 0 && isFiltering(filter) ? (
                    <p className={styles.empty}>{t('noMatches')}</p>
                  ) : (
                    <GroupedTimeline events={visible} run={data.details} gitUrl={gitUrl} />
                  )}
                </>
              )}
            </Panel>
          </>
        );
      }}
    </QueryState>
  );
}

/** One run (`/evidence/:runId`): summary, outcome and the filterable timeline. */
export function EvidenceDetailPage({ onBack, header }: Props) {
  const { t } = useTranslation('evidence');
  const project = useHubProject().selected;
  const { runId = '' } = useParams();
  return (
    <HubPage
      eyebrow={t('title')}
      title={project?.name}
      header={header}
      onBack={onBack}
      backTitle={t('backToRuns')}
    >
      <div className={styles.detail}>
        <div>
          <Button variant="secondary" onClick={onBack}>
            <Icon name="arrow-left" /> {t('allRuns')}
          </Button>
        </div>
        <RunDetail runId={runId} key={runId} />
      </div>
    </HubPage>
  );
}
