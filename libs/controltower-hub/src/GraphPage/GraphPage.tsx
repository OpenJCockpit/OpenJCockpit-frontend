import { useMemo } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import type { ControlTowerGraph } from '@openjcockpit/api';
import { cx, EmptyState, Panel, PanelHeader, PanelTitle } from '@openjcockpit/ui';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useGraph } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { layoutGraph, NODE_HEIGHT, NODE_WIDTH } from './graphLayout';
import styles from './Graph.module.scss';
import common from '../shared.module.scss';

const ELLIPSIS = '…';
const ID_LENGTH = 18;
const TITLE_LENGTH = 27;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.substring(0, max - 1)}${ELLIPSIS}` : text;
}

function GraphDiagram({ graph }: { graph: ControlTowerGraph }) {
  const { t } = useTranslation('controltower');
  const layout = useMemo(() => layoutGraph(graph), [graph]);

  return (
    <div className={styles.graphScroll}>
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={t('graph.label')}
      >
        <defs>
          <marker id="ct-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6" className={styles.arrow} />
          </marker>
        </defs>
        {layout.edges.map((edge) => (
          <path key={edge.key} className={styles.edge} d={edge.path} markerEnd="url(#ct-arrow)" />
        ))}
        {layout.nodes.map((node) => {
          const p = layout.positions.get(node.id) as { x: number; y: number };
          return (
            <g key={node.id} transform={`translate(${p.x},${p.y})`}>
              <rect
                className={cx(styles.node, node.ready && styles.nodeReady)}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="9"
              />
              <text className={styles.nodeId} x="12" y="19">
                {node.id.substring(0, ID_LENGTH)}
              </text>
              <text className={styles.nodeTitle} x="12" y="36">
                {clip(node.title, TITLE_LENGTH)}
              </text>
              <text className={styles.nodeStatus} x="12" y="53">
                {node.ready ? t('graph.ready', { status: node.status }) : node.status}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
      <p className={common.body}>{t('graph.hint')}</p>
      <ControlTowerQuery
        query={graph}
        loadFailed={t('graph.loadFailed')}
        isEmpty={(data) => data.nodes.length === 0}
        empty={<EmptyState title={t('graph.empty')} />}
      >
        {(data) => <GraphDiagram graph={data} />}
      </ControlTowerQuery>
    </Panel>
  );
}
