import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import type { ControlTowerGraph, ControlTowerSpecStatus } from '@openjcockpit/api';
import { Button, cx, Tooltip } from '@openjcockpit/ui';
import { CONTROLTOWER_SPECS_PATH } from '../routePaths';
import { layoutGraph, NODE_HEIGHT, NODE_WIDTH } from './graphLayout';
import styles from './Graph.module.scss';

const ELLIPSIS = '…';
const ID_LENGTH = 18;
const TITLE_LENGTH = 27;
const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

const STATUSES: ControlTowerSpecStatus[] = ['DRAFT', 'APPROVED', 'DISPATCHED', 'DONE'];
const STATUS_CLASS: Record<string, string | undefined> = {
  DRAFT: styles.nodeDraft,
  APPROVED: styles.nodeApproved,
  DISPATCHED: styles.nodeDispatched,
  DONE: styles.nodeDone,
};

function clip(text: string, max: number): string {
  return text.length > max ? `${text.substring(0, max - 1)}${ELLIPSIS}` : text;
}

export function specLink(id: string): string {
  return `${CONTROLTOWER_SPECS_PATH}?focus=${encodeURIComponent(id)}`;
}

/** Pure SVG drawing of a spec graph; an arrow means "the predecessor must be done first". */
export function DependencyGraph({ graph }: { graph: ControlTowerGraph }) {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  const layout = useMemo(() => layoutGraph(graph), [graph]);
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [asList, setAsList] = useState(false);

  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const titleOf = (id: string) => (byId.get(id) as { title: string }).title;
  const statusLabel = (status: string) => t(`specs.status.${status}`, { defaultValue: status });

  // Selection highlights the node, its direct predecessors and its direct dependents.
  const related = useMemo(() => {
    if (!selected) return null;
    const ids = new Set([selected]);
    for (const node of layout.nodes) {
      if (node.id === selected) node.dependsOn.forEach((d) => ids.add(d));
      else if (node.dependsOn.includes(selected)) ids.add(node.id);
    }
    return ids;
  }, [selected, layout]);

  const dependencyLines = layout.nodes.map((node) => {
    const known = node.dependsOn.filter((d) => byId.has(d));
    return {
      id: node.id,
      text: known.length
        ? t('graph.dependsOn', { title: node.title, dependencies: known.map(titleOf).join(', ') })
        : t('graph.noDependencies', { title: node.title }),
    };
  });

  const lineOf = new Map(dependencyLines.map((l) => [l.id, l.text]));

  const fit = () => {
    const available = scroller.current?.clientWidth ?? 0;
    setZoom(available > 0 ? Math.min(1, Math.max(MIN_ZOOM, available / layout.width)) : 1);
  };
  const zoomBy = (factor: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));

  const open = (id: string) => void navigate(specLink(id));
  const onNodeKey = (event: KeyboardEvent, id: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      open(id);
    } else if (event.key === ' ') {
      event.preventDefault();
      setSelected((current) => (current === id ? null : id));
    } else if (event.key === 'Escape') {
      setSelected(null);
    }
  };

  const selectedNode = selected ? byId.get(selected) : undefined;

  return (
    <div>
      <div className={styles.toolbar}>
        <ul className={styles.legend} aria-label={t('graph.legend')}>
          {STATUSES.map((status) => (
            <li key={status} className={styles.legendItem}>
              <span className={cx(styles.swatch, STATUS_CLASS[status])} aria-hidden="true" />
              {statusLabel(status)}
            </li>
          ))}
        </ul>
        <div className={styles.controls}>
          {!asList && (
            <>
              <Button size="sm" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
                {t('graph.zoomOut')}
              </Button>
              <Button size="sm" onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
                {t('graph.zoomIn')}
              </Button>
              <Button size="sm" onClick={fit}>
                {t('graph.fit')}
              </Button>
            </>
          )}
          <Button size="sm" aria-pressed={asList} onClick={() => setAsList((v) => !v)}>
            {asList ? t('graph.showGraph') : t('graph.showList')}
          </Button>
        </div>
      </div>

      {selectedNode && !asList && (
        <p className={styles.selection}>
          {t('graph.selected', { title: selectedNode.title })}{' '}
          <Link to={specLink(selectedNode.id)}>{t('graph.open')}</Link>{' '}
          <Button size="sm" onClick={() => setSelected(null)}>
            {t('graph.clearSelection')}
          </Button>
        </p>
      )}

      {asList ? (
        <ul className={styles.edgeList} aria-label={t('graph.listLabel')}>
          {layout.nodes.map((node) => (
            <li key={node.id}>
              <Link to={specLink(node.id)}>{node.title}</Link> ·{' '}
              <span className={styles.listStatus}>{statusLabel(node.status)}</span>
              {' — '}
              {lineOf.get(node.id)}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.graphScroll} ref={scroller}>
          <svg
            width={layout.width * zoom}
            height={layout.height * zoom}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="group"
            aria-label={t('graph.label')}
          >
            <defs>
              <marker
                id="ct-arrow"
                markerWidth="9"
                markerHeight="9"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0 0 L6 3 L0 6" className={styles.arrow} />
              </marker>
            </defs>
            {layout.edges.map((edge) => (
              <path
                key={edge.key}
                className={cx(
                  styles.edge,
                  related && !(related.has(edge.from) && related.has(edge.to)) && styles.dimmed,
                )}
                d={edge.path}
                markerEnd="url(#ct-arrow)"
              />
            ))}
            {layout.nodes.map((node) => {
              const p = layout.positions.get(node.id) as { x: number; y: number };
              const dimmed = related !== null && !related.has(node.id);
              return (
                <Tooltip
                  key={node.id}
                  content={`${t('graph.tooltip', { id: node.id, title: node.title })}`}
                >
                  <g
                    transform={`translate(${p.x},${p.y})`}
                    className={cx(styles.nodeGroup, dimmed && styles.dimmed)}
                    role="link"
                    tabIndex={0}
                    aria-label={`${node.title}, ${statusLabel(node.status)}. ${t('graph.openHint')}`}
                    aria-current={selected === node.id ? 'true' : undefined}
                    onClick={() => (selected === node.id ? open(node.id) : setSelected(node.id))}
                    onKeyDown={(event) => onNodeKey(event, node.id)}
                  >
                    <rect
                      className={cx(
                        styles.node,
                        STATUS_CLASS[node.status],
                        node.ready && styles.nodeReady,
                        selected === node.id && styles.nodeSelected,
                      )}
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
                </Tooltip>
              );
            })}
          </svg>
        </div>
      )}

      {/* Screen-reader equivalent of the drawing; the arrows carry meaning the SVG alone cannot. */}
      {!asList && (
        <ul className={styles.visuallyHidden} aria-label={t('graph.listLabel')}>
          {dependencyLines.map((line) => (
            <li key={line.id}>{line.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
