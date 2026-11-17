import type { ReactNode } from 'react';
import { HubPage, Icon, Panel, QueryState, StatusChip } from '@openjcockpit/ui';
import { useTranslation } from '@openjcockpit/i18n';
import { EvidenceList } from '../EvidenceList/EvidenceList';
import { useWorkspace } from '../useWorkspace';

interface Props {
  onBack: () => void;
  /** Replaces the default back-button header, e.g. with the host's shared top menu. */
  header?: ReactNode;
}

/** The full page of the app: the same list as the widget, with the page chrome around it. */
export function EvidencePage({ onBack, header }: Props) {
  const { t } = useTranslation('evidence');
  const workspace = useWorkspace();

  return (
    <HubPage
      icon={<Icon name="pulse" />}
      title={t('title')}
      subtitle={<StatusChip label={t('sampleData')} kind="waiting" />}
      header={header}
      onBack={onBack}
      backTitle={t('back')}
    >
      <Panel as="section">
        <QueryState
          query={workspace}
          loadFailed={t('failed')}
          retryLabel={t('retry')}
          loadingLabel={t('loading')}
        >
          {(data) => <EvidenceList events={data.evidenceEvents} />}
        </QueryState>
      </Panel>
    </HubPage>
  );
}
