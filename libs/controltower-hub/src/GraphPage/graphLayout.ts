import type { ControlTowerGraph } from '@openjcockpit/api';

export const NODE_WIDTH = 216;
export const NODE_HEIGHT = 66;
const COLUMN_STEP = 275;
const ROW_STEP = 112;
const MARGIN_X = 20;
const MARGIN_Y = 25;

export interface GraphLayout {
  positions: Map<string, { x: number; y: number }>;
  /** Specs that have a position, in graph order. */
  nodes: ControlTowerGraph['nodes'];
  /** One Bezier path per dependency whose two ends are both placed. */
  edges: { key: string; from: string; to: string; path: string }[];
  width: number;
  height: number;
}

const EDGE_Y = NODE_HEIGHT / 2 - 5;

/** Places each spec one column right of its deepest dependency; specs of one depth stack in rows. */
export function layoutGraph(graph: ControlTowerGraph): GraphLayout {
  const positions = new Map<string, { x: number; y: number }>();
  const levels = new Map<string, number>();
  const counts = new Map<number, number>();
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const id of graph.topologicalOrder) {
    const node = byId.get(id);
    const depth = Math.max(0, ...(node?.dependsOn ?? []).map((d) => (levels.get(d) ?? -1) + 1));
    levels.set(id, depth);
    const order = counts.get(depth) ?? 0;
    counts.set(depth, order + 1);
    positions.set(id, { x: MARGIN_X + depth * COLUMN_STEP, y: MARGIN_Y + order * ROW_STEP });
  }
  const nodes = graph.nodes.filter((node) => positions.has(node.id));
  const edges = nodes.flatMap((node) =>
    node.dependsOn.flatMap((dep) => {
      const from = positions.get(dep);
      const to = positions.get(node.id);
      if (!from || !to) return [];
      const path = `M${from.x + NODE_WIDTH},${from.y + EDGE_Y} C${from.x + NODE_WIDTH + 32},${from.y + EDGE_Y} ${to.x - 25},${to.y + EDGE_Y} ${to.x},${to.y + EDGE_Y}`;
      return [{ key: `${dep}-${node.id}`, from: dep, to: node.id, path }];
    }),
  );
  return {
    positions,
    nodes,
    edges,
    width: Math.max(320, Math.max(0, ...levels.values()) * COLUMN_STEP + 260),
    height: Math.max(160, Math.max(0, ...counts.values()) * ROW_STEP + 35),
  };
}
