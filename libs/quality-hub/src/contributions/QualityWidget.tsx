import { useTranslation } from '@openjcockpit/i18n';
import { QueryState } from '@openjcockpit/ui';
import { QualityList } from '../QualityList/QualityList';
import { WithTranslations } from '../registerTranslations';
import { useWorkspace } from '../useWorkspace';

function Content() {
  const { t } = useTranslation('quality');
  const workspace = useWorkspace();
  if (!workspace.hasProject) return <p data-testid="quality-widget-no-project">{t('noProject')}</p>;
  return (
    <QueryState
      query={workspace}
      loadFailed={t('failed')}
      retryLabel={t('retry')}
      loadingLabel={t('loading')}
    >
      {(data) => <QualityList controls={data.qualityControls} />}
    </QueryState>
  );
}

/** Home widget; the host loads it lazily, so it registers its own translations. */
export default function QualityWidget() {
  return (
    <WithTranslations>
      <Content />
    </WithTranslations>
  );
}
