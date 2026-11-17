import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { layoutGraph } from './graphLayout';
import { ct, GRAPH, renderRoutes } from '../testUtils';

describe('graph', () => {
  const path = '/controltower/graph';

  it('draws the specs and their dependency', async () => {
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('img', { name: 'Spec dependency graph' });
    expect(within(svg).getByText('Login page')).toBeInTheDocument();
    expect(within(svg).getByText('APPROVED · READY')).toBeInTheDocument();
    expect(svg.querySelectorAll('path[marker-end]')).toHaveLength(1);
  });

  it('skips an edge to an unknown spec and a node outside the order', async () => {
    ct.getControlTowerGraph.mockResolvedValue({
      nodes: [
        { id: 'a', title: 'A', status: 'DRAFT', dependsOn: ['missing'], ready: false },
        { id: 'b', title: 'B', status: 'DRAFT', dependsOn: ['a'], ready: false },
      ],
      topologicalOrder: ['a'],
    });
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('img', { name: 'Spec dependency graph' });
    expect(svg.querySelectorAll('path[marker-end]')).toHaveLength(0);
    expect(within(svg).queryByText('B')).toBeNull();
  });

  it('shows the empty and error states', async () => {
    ct.getControlTowerGraph.mockResolvedValueOnce({ nodes: [], topologicalOrder: [] });
    const first = renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText(/No specifications yet/)).toBeInTheDocument();
    first.unmount();
    ct.getControlTowerGraph.mockRejectedValue(new Error('x'));
    renderRoutes(controltowerRoutes, { path });
    expect(await screen.findByText('Failed to load the dependency graph.')).toBeInTheDocument();
  });

  it('lays out a column per dependency depth', () => {
    const layout = layoutGraph(GRAPH);
    expect(layout.positions.get('s1')).toEqual({ x: 20, y: 25 });
    expect(layout.positions.get('s2')).toEqual({ x: 295, y: 25 });
    expect(layoutGraph({ nodes: [], topologicalOrder: [] })).toMatchObject({
      width: 320,
      height: 160,
    });
  });

  it('lays out a graph whose order names an unknown spec and draws no edge from a spec outside the order', async () => {
    const graph = {
      nodes: [
        { id: 'a', title: 'A', status: 'DRAFT', dependsOn: [], ready: false },
        { id: 'b', title: 'B', status: 'DRAFT', dependsOn: ['a'], ready: false },
      ],
      topologicalOrder: ['ghost', 'a'],
    };
    expect(layoutGraph(graph).positions.has('ghost')).toBe(true);
    ct.getControlTowerGraph.mockResolvedValue(graph);
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('img', { name: 'Spec dependency graph' });
    expect(svg.querySelectorAll('path[marker-end]')).toHaveLength(0);
  });
});
