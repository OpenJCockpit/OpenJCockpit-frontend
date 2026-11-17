import { useTranslation } from '@openjcockpit/i18n';
import { EmptyState, Panel, PanelBody, PanelHeader, PanelTitle } from '@openjcockpit/ui';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useGraph } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { DependencyGraph } from './DependencyGraph';

/** The spec dependency graph: an arrow means "the predecessor must be done first". */
export function GraphPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const graph = useGraph(repository.id);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('graph.title')}</PanelTitle>
      </PanelHeader>
      <PanelBody as="p">{t('graph.hint')}</PanelBody>
      <ControlTowerQuery
        query={graph}
        loadFailed={t('graph.loadFailed')}
        isEmpty={(data) => data.nodes.length === 0}
        empty={<EmptyState title={t('graph.empty')} />}
      >
        {(data) => <DependencyGraph graph={data} />}
      </ControlTowerQuery>
    </Panel>
  );
}
