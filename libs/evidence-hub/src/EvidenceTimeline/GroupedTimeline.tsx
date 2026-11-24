import type { EvidenceTimelineEvent } from '@openjcockpit/api';
import { useFormatters, useLocale, useTranslation } from '@openjcockpit/i18n';
import { STATUS_GLYPHS } from '../glyphs';
import { relativeAge } from '../runFormat';
import styles from './GroupedTimeline.module.scss';

interface Group {
  key: string;
  source: EvidenceTimelineEvent['source'];
  agentId?: string | null;
  events: EvidenceTimelineEvent[];
}

/** Consecutive events of the same agent (or the same non-agent source) form one step. */
function groupSteps(events: EvidenceTimelineEvent[]): Group[] {
  const groups: Group[] = [];
  for (const event of events) {
    const key = event.source === 'agent' ? `agent:${event.agentId ?? ''}` : event.source;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.events.push(event);
    else groups.push({ key, source: event.source, agentId: event.agentId, events: [event] });
  }
  return groups;
}

/** A run's events oldest first, grouped by agent step, with absolute time and relative age. */
export function GroupedTimeline({ events }: { events: EvidenceTimelineEvent[] }) {
  const { t } = useTranslation('evidence');
  const { formatTime } = useFormatters();
  const { locale } = useLocale();
  return (
    <div className={styles.timeline}>
      {groupSteps(events).map((group, index) => (
        <section key={`${group.key}-${index}`} className={styles.step}>
          <h3>
            {group.source === 'agent' && group.agentId
              ? group.agentId
              : t(`source.${group.source}`)}
          </h3>
          {group.events.map((event, i) => {
            const who = event.actor ?? event.agentId;
            return (
              <article className={styles.event} key={`${event.timestamp}-${i}`}>
                <time dateTime={event.timestamp} title={relativeAge(event.timestamp, locale)}>
                  {formatTime(event.timestamp, { timeStyle: 'short' })}
                  <small>{relativeAge(event.timestamp, locale)}</small>
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
                  {STATUS_GLYPHS[event.status]}
                </span>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
