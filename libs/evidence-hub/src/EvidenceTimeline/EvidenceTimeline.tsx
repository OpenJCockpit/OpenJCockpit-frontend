import type { EvidenceStatus, EvidenceTimelineEvent } from '@openjcockpit/api';
import { useFormatters, useTranslation } from '@openjcockpit/i18n';
import styles from '../EvidenceList/EvidenceList.module.scss';

/** Decorative glyphs, not translatable copy. */
const GLYPHS: Record<EvidenceStatus, string> = {
  ok: '✓',
  running: '…',
  waiting: '⏸',
  failed: '✕',
};

interface Props {
  /** Events as the server sends them, oldest first. */
  events: EvidenceTimelineEvent[];
  /** Newest events to show; all when omitted. */
  limit?: number;
}

/** Newest-first timeline of a run's agent, approval and git events. */
export function EvidenceTimeline({ events, limit }: Props) {
  const { t } = useTranslation('evidence');
  const { formatTime } = useFormatters();
  return (
    <div className={styles.evidenceTimeline}>
      {[...events]
        .reverse()
        .slice(0, limit)
        .map((event, index) => {
          const who = event.actor ?? event.agentId;
          return (
            <article className={styles.evidenceEvent} key={`${event.timestamp}-${index}`}>
              <time dateTime={event.timestamp}>
                {formatTime(event.timestamp, { timeStyle: 'short' })}
              </time>
              <div>
                <strong>{event.title}</strong>
                {who && <span>{t('by', { actor: who })}</span>}
              </div>
              <span
                className={`${styles.check} ${event.status === 'failed' ? styles.failed : ''}`}
                role="img"
                aria-label={t(`status.${event.status}`)}
              >
                {GLYPHS[event.status]}
              </span>
            </article>
          );
        })}
    </div>
  );
}
