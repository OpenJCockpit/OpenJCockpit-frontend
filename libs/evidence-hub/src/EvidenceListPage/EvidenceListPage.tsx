import type { ReactNode } from 'react';
import { useState } from 'react';
import { cx, formInputClass, HubPage, Icon, Panel, QueryState, Select } from '@openjcockpit/ui';
import { useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { ExportMenu } from '../ExportMenu/ExportMenu';
import { RunList } from '../RunList/RunList';
import { filterRuns } from '../runFilter';
import { useEvidenceExportJob } from '../useEvidenceExportJob';
import { useEvidenceRuns } from '../useEvidenceRuns';
import styles from './EvidenceListPage.module.scss';

interface Props {
  onBack: () => void;
  /** Replaces the default back-button header, e.g. with the host's shared top menu. */
  header?: ReactNode;
}

/** Past runs of the project; each links to its own detail route. */
export function EvidenceListPage({ onBack, header }: Props) {
  const { t } = useTranslation('evidence');
  const project = useHubProject().selected;
  const runs = useEvidenceRuns();
  const [query, setQuery] = useState('');
  const [workflow, setWorkflow] = useState('');
  const items = runs.data?.pages.flatMap((page) => page.items) ?? [];
  const workflows = [...new Set(items.flatMap((run) => run.workflowId ?? []))].sort();
  const visible = filterRuns(
    workflow ? items.filter((run) => run.workflowId === workflow) : items,
    query,
  );
  // The export ignores the search text and always covers every run of its scope.
  const exportJob = useEvidenceExportJob(workflow || undefined);

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
          <>
            <div className={styles.toolbar}>
              <div className={styles.search} role="search">
                <Icon name="search" />
                <input
                  className={cx(formInputClass, styles.searchInput)}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('runs.searchPlaceholder')}
                  aria-label={t('runs.search')}
                  data-testid="evidence-run-search"
                />
              </div>
              {workflows.length > 1 && (
                <Select
                  label={t('runs.workflowFilter')}
                  value={workflow}
                  onChange={setWorkflow}
                  options={[
                    { value: '', label: t('runs.allWorkflows') },
                    ...workflows.map((id) => ({ value: id, label: id })),
                  ]}
                />
              )}
              <ExportMenu
                label={
                  workflow ? t('export.scope.workflow', { workflow }) : t('export.scope.project')
                }
                dateRange
                pending={exportJob.running}
                progress={exportJob.progress}
                onCancel={exportJob.cancel}
                error={exportJob.error ?? false}
                onExport={(format, includeOutputs, range) =>
                  exportJob.start({
                    format,
                    includeOutputs,
                    from: range?.from ? `${range.from}T00:00:00Z` : undefined,
                    to: range?.to ? `${range.to}T23:59:59Z` : undefined,
                  })
                }
              />
            </div>
            <Panel as="div" className={styles.panel}>
              <RunList
                runs={visible}
                emptyText={t('runs.noMatches')}
                hasMore={!!runs.hasNextPage}
                loadingMore={runs.isFetchingNextPage}
                onLoadMore={() => void runs.fetchNextPage()}
              />
            </Panel>
          </>
        )}
      </QueryState>
    </HubPage>
  );
}
