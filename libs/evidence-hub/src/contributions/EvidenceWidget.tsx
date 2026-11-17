import { useTranslation } from '@openjcockpit/i18n';
import { QueryState } from '@openjcockpit/ui';
import { EvidenceList } from '../EvidenceList/EvidenceList';
import { WithTranslations } from '../registerTranslations';
import { useWorkspace } from '../useWorkspace';

function Content() {
  const { t } = useTranslation('evidence');
  const workspace = useWorkspace();
  if (!workspace.hasProject) {
    return <p data-testid="evidence-widget-no-project">{t('noProject')}</p>;
  }
  return (
    <QueryState
      query={workspace}
      loadFailed={t('failed')}
      retryLabel={t('retry')}
      loadingLabel={t('loading')}
    >
      {(data) => <EvidenceList events={data.evidenceEvents} limit={3} />}
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
