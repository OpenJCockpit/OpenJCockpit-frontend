import { useTranslation } from '@openjcockpit/i18n';
import { Link } from 'react-router';
import {
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  buttonClass,
} from '@openjcockpit/ui';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useGraph } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { CONTROLTOWER_INTERVIEWS_PATH } from '../routePaths';
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
        empty={
          <EmptyState
            title={t('graph.empty')}
            action={
              <Link
                className={buttonClass({ variant: 'secondary' })}
                to={CONTROLTOWER_INTERVIEWS_PATH}
              >
                {t('graph.emptyAction')}
              </Link>
            }
          />
        }
      >
        {(data) => <DependencyGraph graph={data} />}
      </ControlTowerQuery>
    </Panel>
  );
}
