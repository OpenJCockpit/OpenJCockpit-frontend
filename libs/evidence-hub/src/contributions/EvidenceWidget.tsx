import { useTranslation } from '@openjcockpit/i18n';
import { QueryState } from '@openjcockpit/ui';
import { EvidenceTimeline } from '../EvidenceTimeline/EvidenceTimeline';
import { WithTranslations } from '../registerTranslations';
import { useLatestEvidence } from '../useLatestEvidence';

/** Newest events the dashboard widget shows. */
const WIDGET_EVENTS = 5;

function Content() {
  const { t } = useTranslation('evidence');
  const latest = useLatestEvidence();
  if (!latest.hasProject) {
    return <p data-testid="evidence-widget-no-project">{t('noProject')}</p>;
  }
  const noRuns = <p data-testid="evidence-widget-empty">{t('noRuns')}</p>;
  return (
    <QueryState
      query={latest}
      loadFailed={t('failed')}
      retryLabel={t('retry')}
      loadingLabel={t('loading')}
      none={noRuns}
      isEmpty={(run) => run.events.length === 0}
      empty={noRuns}
    >
      {(run) => <EvidenceTimeline events={run.events} limit={WIDGET_EVENTS} />}
    </QueryState>
  );
}

/** Home widget; the host loads it lazily, so it registers its own translations. */
export default function EvidenceWidget() {
  return (
    <WithTranslations>
      <Content />
    </WithTranslations>
  );
}
