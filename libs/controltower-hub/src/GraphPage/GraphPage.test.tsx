import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { layoutGraph } from './graphLayout';
import { ct, GRAPH, renderRoutes } from '../testUtils';

describe('graph', () => {
  const path = '/controltower/graph';

  it('draws the specs and their dependency', async () => {
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
    expect(within(svg).getByText('Login page')).toBeInTheDocument();
    expect(within(svg).getByText('Approved · Ready')).toBeInTheDocument();
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
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
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
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
    expect(svg.querySelectorAll('path[marker-end]')).toHaveLength(0);
  });

  it('highlights the selection and its neighbours and dims the rest', async () => {
    ct.getControlTowerGraph.mockResolvedValue({
      nodes: [
        { id: 'a', title: 'A', status: 'DONE', dependsOn: [], ready: false },
        { id: 'b', title: 'B', status: 'APPROVED', dependsOn: ['a'], ready: true },
        { id: 'c', title: 'C', status: 'DRAFT', dependsOn: [], ready: false },
      ],
      topologicalOrder: ['a', 'b', 'c'],
    });
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
    fireEvent.click(within(svg).getByRole('link', { name: /^B, Approved/ }));
    const nodes = svg.querySelectorAll('g[role="link"]');
    expect([...nodes].map((n) => n.getAttribute('class')?.includes('dimmed'))).toEqual([
      false,
      false,
      true,
    ]);
    expect(screen.getByText(/Selected: B/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(svg.querySelectorAll('.dimmed')).toHaveLength(0);
  });

  it('opens the spec with Enter', async () => {
    const { router } = renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
    fireEvent.keyDown(within(svg).getByRole('link', { name: /^Login page/ }), { key: 'Enter' });
    expect(router.state.location.pathname).toBe('/controltower/specs');
    expect(router.state.location.search).toBe('?focus=s1');
  });

  it('shows the legend, zooms, and lists every dependency as text', async () => {
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
    expect(screen.getByRole('list', { name: 'Status' })).toBeInTheDocument();
    const width = Number(svg.getAttribute('width'));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(Number(svg.getAttribute('width'))).toBeGreaterThan(width);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }));
    expect(Number(svg.getAttribute('width'))).toBe(width);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(Number(svg.getAttribute('width'))).toBeLessThan(width);
    expect(screen.getAllByText(/depends on Login page/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Show as list' }));
    expect(screen.queryByRole('group', { name: 'Spec dependency graph' })).toBeNull();
    expect(screen.getByText(/Login page has no dependencies/)).toBeInTheDocument();
  });

  it('selects with Space, clears with Escape, ignores other keys, and opens a selected node on click', async () => {
    const { router } = renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
    const node = within(svg).getByRole('link', { name: /^Login page/ });
    fireEvent.keyDown(node, { key: 'a' });
    expect(svg.querySelectorAll('.dimmed')).toHaveLength(0);
    fireEvent.keyDown(node, { key: ' ' });
    expect(screen.getByText(/Selected: Login page/)).toBeInTheDocument();
    expect(svg.querySelectorAll('.dimmed')).toHaveLength(0);
    fireEvent.keyDown(node, { key: ' ' });
    expect(screen.queryByText(/Selected:/)).toBeNull();
    fireEvent.keyDown(node, { key: ' ' });
    fireEvent.keyDown(node, { key: 'Escape' });
    expect(screen.queryByText(/Selected:/)).toBeNull();
    fireEvent.click(node);
    fireEvent.click(node);
    expect(router.state.location.search).toBe('?focus=s1');
  });

  it('fits the drawing to the available width and keeps unknown statuses readable', async () => {
    ct.getControlTowerGraph.mockResolvedValue({
      nodes: [{ id: 'x', title: 'X', status: 'WEIRD', dependsOn: [], ready: false }],
      topologicalOrder: ['x'],
    });
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(160);
    renderRoutes(controltowerRoutes, { path });
    const svg = await screen.findByRole('group', { name: 'Spec dependency graph' });
    expect(within(svg).getByRole('link', { name: /^X, WEIRD/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }));
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(320 * 0.5, 0);
    width.mockRestore();
  });
});
