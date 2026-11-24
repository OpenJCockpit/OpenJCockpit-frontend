import type { EvidenceRunSummary } from '@openjcockpit/api';
import { useFormatters, useLocale, useTranslation } from '@openjcockpit/i18n';
import { Button, Select, StatusChip } from '@openjcockpit/ui';
import { durationMinutes, relativeAge, runStatusKind } from '../runFormat';
import styles from './RunList.module.scss';

interface Props {
  runs: EvidenceRunSummary[];
  selectedRunId: string;
  onSelect: (runId: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/** Past runs: a left rail on wide screens, a dropdown on narrow ones (switched in CSS). */
export function RunList({
  runs,
  selectedRunId,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  const { t } = useTranslation('evidence');
  const { formatDateTime } = useFormatters();
  const { locale } = useLocale();

  const options = runs.map((run) => ({
    value: run.runId,
    label: `${run.workflowId ?? run.runId} · ${run.startedAt ? formatDateTime(run.startedAt) : '–'}`,
  }));

  return (
    <nav aria-label={t('runs.title')} className={styles.runs}>
      <div className={styles.dropdown}>
        <Select
          block
          label={t('runs.title')}
          value={selectedRunId}
          options={options}
          onChange={onSelect}
          data-testid="evidence-run-select"
        />
      </div>
      <ul className={styles.rail}>
        {runs.map((run) => {
          const minutes = durationMinutes(run.startedAt, run.completedAt);
          const selected = run.runId === selectedRunId;
          return (
            <li key={run.runId}>
              <button
                type="button"
                className={styles.run}
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(run.runId)}
              >
                <span className={styles.head}>
                  <strong>{run.workflowId ?? run.runId}</strong>
                  <StatusChip
                    label={t(`runStatus.${run.status.toLowerCase()}`, { defaultValue: run.status })}
                    kind={runStatusKind(run.status)}
                  />
                </span>
                <span className={styles.meta}>
                  {run.startedAt && relativeAge(run.startedAt, locale)}
                  {run.startedBy && ` · ${run.startedBy}`}
                  {minutes !== null && ` · ${t('duration', { count: minutes })}`}
                </span>
                {!!run.failedEventCount && (
                  <span className={styles.failedBadge}>
                    {t('runs.failedEvents', { count: run.failedEventCount })}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <Button type="button" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? t('loading') : t('runs.loadMore')}
        </Button>
      )}
    </nav>
  );
}
