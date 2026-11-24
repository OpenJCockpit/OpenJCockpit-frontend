import { Link } from 'react-router';
import type { EvidenceRunSummary } from '@openjcockpit/api';
import { useLocale, useTranslation } from '@openjcockpit/i18n';
import { Button, DataTable, fieldHintClass, Icon, IconBox, StatusChip } from '@openjcockpit/ui';
import { durationMinutes, relativeAge, runStatusKind } from '../runFormat';
import { evidenceRunPath } from '../routePaths';
import styles from './RunList.module.scss';

interface Props {
  runs: EvidenceRunSummary[];
  /** Shown in place of the rows when there are none (e.g. nothing matches the search). */
  emptyText: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/** Past runs as a table, each row linking to its detail route. */
export function RunList({ runs, emptyText, hasMore, loadingMore, onLoadMore }: Props) {
  const { t } = useTranslation('evidence');
  const { locale } = useLocale();

  return (
    <nav aria-label={t('runs.title')}>
      <DataTable className={styles.table}>
        <thead>
          <tr>
            <th>{t('runs.columnRun')}</th>
            <th>{t('runs.columnStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const minutes = durationMinutes(run.startedAt, run.completedAt);
            const details = [
              run.startedAt && relativeAge(run.startedAt, locale),
              run.startedBy,
              minutes !== null && t('duration', { count: minutes }),
            ].filter(Boolean);
            return (
              <tr key={run.runId}>
                <td>
                  <Link to={evidenceRunPath(run.runId)} className={styles.rowLink}>
                    <span className={styles.row}>
                      <IconBox label={<Icon name="pulse" />} compact />
                      <span>
                        <strong>{run.workflowId ?? run.runId}</strong>
                        <span>{details.join(' · ')}</span>
                        {!!run.failedEventCount && (
                          <span className={styles.failedBadge}>
                            {t('runs.failedEvents', { count: run.failedEventCount })}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </td>
                <td>
                  <StatusChip
                    label={t(`runStatus.${run.status.toLowerCase()}`, { defaultValue: run.status })}
                    kind={runStatusKind(run.status)}
                  />
                </td>
              </tr>
            );
          })}
          {runs.length === 0 && (
            <tr>
              <td colSpan={2} className={fieldHintClass}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      {hasMore && (
        <Button type="button" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? t('loading') : t('runs.loadMore')}
        </Button>
      )}
    </nav>
  );
}
