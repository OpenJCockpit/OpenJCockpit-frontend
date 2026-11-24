import type { EvidenceRunDetails, EvidenceTimelineEvent } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { EventRow } from './EventRow';
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

interface Props {
  events: EvidenceTimelineEvent[];
  run: EvidenceRunDetails;
  gitUrl?: string | null;
}

/** A run's events oldest first, grouped by agent step, each row expandable. */
export function GroupedTimeline({ events, run, gitUrl }: Props) {
  const { t } = useTranslation('evidence');
  return (
    <div className={styles.timeline}>
      {groupSteps(events).map((group, index) => (
        <section key={`${group.key}-${index}`} className={styles.step}>
          <h3>
            {group.source === 'agent' && group.agentId
              ? group.agentId
              : t(`source.${group.source}`)}
          </h3>
          {group.events.map((event, i) => (
            <EventRow key={`${event.timestamp}-${i}`} event={event} run={run} gitUrl={gitUrl} />
          ))}
        </section>
      ))}
    </div>
  );
}
