import { useState } from 'react';
import type { EvidenceRunDetails, EvidenceTimelineEvent } from '@openjcockpit/api';
import { useFormatters, useLocale, useTranslation } from '@openjcockpit/i18n';
import { QueryState } from '@openjcockpit/ui';
import { STATUS_GLYPHS } from '../glyphs';
import { gitEventUrl } from '../gitLinks';
import { relativeAge } from '../runFormat';
import { useEvidenceOutput } from '../useEvidenceOutput';
import styles from './GroupedTimeline.module.scss';

interface Props {
  event: EvidenceTimelineEvent;
  run: Pick<EvidenceRunDetails, 'runId' | 'commitHash' | 'branch'>;
  /** Clone URL of the project, used to link git events to the commit or branch. */
  gitUrl?: string | null;
}

function AgentOutput({ runId, agentKey }: { runId: string; agentKey: string }) {
  const { t } = useTranslation('evidence');
  const output = useEvidenceOutput(runId, agentKey, true);
  return (
    <QueryState
      query={output}
      loadFailed={t('failed')}
      retryLabel={t('retry')}
      loadingLabel={t('loading')}
    >
      {(data) => (
        <pre className={styles.output} aria-label={t('output')}>
          {data.output}
        </pre>
      )}
    </QueryState>
  );
}

/** One timeline entry; expands to its detail text and, for agents, the full output loaded on demand. */
export function EventRow({ event, run, gitUrl }: Props) {
  const { t } = useTranslation('evidence');
  const { formatTime } = useFormatters();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const who = event.actor ?? event.agentId;
  const expandable = !!event.detail || !!event.outputRef;
  const link = event.source === 'git' ? gitEventUrl(gitUrl, event.title, run) : null;
  const age = relativeAge(event.timestamp, locale);

  const heading = link ? (
    <a href={link} target="_blank" rel="noreferrer noopener">
      {event.title}
    </a>
  ) : (
    event.title
  );

  return (
    <article className={styles.event}>
      <time dateTime={event.timestamp} title={age}>
        {formatTime(event.timestamp, { timeStyle: 'short' })}
        <small>{age}</small>
      </time>
      <div>
        {expandable ? (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <strong>{event.title}</strong>
          </button>
        ) : (
          <strong>{heading}</strong>
        )}
        {who && <span>{t('by', { actor: who })}</span>}
        {open && (
          <div className={styles.expanded}>
            {event.detail && <p>{event.detail}</p>}
            {event.outputRef && <AgentOutput runId={run.runId} agentKey={event.outputRef} />}
            {link && (
              <a href={link} target="_blank" rel="noreferrer noopener">
                {t('openInGit')}
              </a>
            )}
          </div>
        )}
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
}
