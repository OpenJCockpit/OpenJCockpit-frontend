import type { ReactNode } from 'react';
import { useState } from 'react';
import { cx, formInputClass, HubPage, Icon, Panel, QueryState } from '@openjcockpit/ui';
import { useHubProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { RunList } from '../RunList/RunList';
import { filterRuns } from '../runFilter';
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
  const items = runs.data?.pages.flatMap((page) => page.items) ?? [];
  const visible = filterRuns(items, query);

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
