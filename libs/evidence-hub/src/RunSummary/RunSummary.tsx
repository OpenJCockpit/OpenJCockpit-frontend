import type { EvidenceRunDetails } from '@openjcockpit/api';
import { useFormatters, useTranslation } from '@openjcockpit/i18n';
import { StatusChip } from '@openjcockpit/ui';
import { durationMinutes, runStatusKind } from '../runFormat';
import styles from './RunSummary.module.scss';

/** Header card of the selected run: status, workflow, who started it, duration, branch and commit. */
export function RunSummary({ details }: { details: EvidenceRunDetails }) {
  const { t } = useTranslation('evidence');
  const { formatDateTime } = useFormatters();
  const minutes = durationMinutes(details.startedAt, details.completedAt);
  const rows: [string, string | null | undefined][] = [
    [t('summary.workflow'), details.workflowId],
    [t('summary.startedBy'), details.startedBy],
    [t('summary.startedAt'), details.startedAt ? formatDateTime(details.startedAt) : null],
    [t('summary.duration'), minutes === null ? null : t('duration', { count: minutes })],
    [t('summary.branch'), details.branch],
    [t('summary.commit'), details.commitHash],
  ];
  return (
    <section className={styles.summary} aria-label={t('summary.title')}>
      <StatusChip
        label={t(`runStatus.${details.status.toLowerCase()}`, { defaultValue: details.status })}
        kind={runStatusKind(details.status)}
      />
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || '–'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
