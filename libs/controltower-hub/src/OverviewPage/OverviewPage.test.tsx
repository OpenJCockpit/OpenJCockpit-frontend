import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, renderRoutes, SPEC_DISPATCHED, SPEC_DRAFT } from '../testUtils';

const stat = (label: string) =>
  screen
    .getAllByText(label)
    .find((el) => el.tagName === 'SPAN')!
    .closest('a')!;

describe('overview', () => {
  it('shows the counts of the linked repository as links', async () => {
    renderRoutes(controltowerRoutes);
    expect(await screen.findByText('demo-repo')).toBeInTheDocument();
    await waitFor(() => expect(within(stat('Interviews')).getByText('1')).toBeInTheDocument());
    expect(within(stat('Specifications')).getByText('2')).toBeInTheDocument();
    expect(within(stat('Ready to dispatch')).getByText('1')).toBeInTheDocument();
    expect(stat('Interviews')).toHaveAttribute('href', '/controltower/interviews');
    expect(stat('Specifications')).toHaveAttribute('href', '/controltower/specs');
    expect(stat('Ready to dispatch')).toHaveAttribute('href', '/controltower/queue');
  });

  it('shows a skeleton while loading and a dash when loading failed', async () => {
    ct.listControlTowerSpecs.mockRejectedValue(new Error('x'));
    ct.listControlTowerInterviews.mockReturnValue(new Promise(() => undefined));
    renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    expect(await within(stat('Specifications')).findByText('–')).toBeInTheDocument();
    expect(within(stat('Interviews')).getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows zero for an empty list', async () => {
    ct.listControlTowerInterviews.mockResolvedValue([]);
    renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    expect(await within(stat('Interviews')).findByText('0')).toBeInTheDocument();
  });

  it('shows the subtitle on the overview only', async () => {
    renderRoutes(controltowerRoutes);
    expect(await screen.findByText(/Interview-first requirements/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Specifications/ }));
    await screen.findByText('Specification registry');
    expect(screen.queryByText(/Interview-first requirements/)).not.toBeInTheDocument();
  });

  describe('primary button', () => {
    const cta = (name: string, href: string) =>
      expect(screen.findByRole('link', { name })).resolves.toHaveAttribute('href', href);

    it('asks for a template when there is none', async () => {
      ct.listControlTowerTemplates.mockResolvedValue([]);
      renderRoutes(controltowerRoutes);
      await cta('Create a template', '/controltower/templates');
    });

    it('starts discovery when there are no specs', async () => {
      ct.listControlTowerSpecs.mockResolvedValue([]);
      renderRoutes(controltowerRoutes);
      await cta('Start discovery', '/controltower/interviews');
    });

    it('reviews the drafts', async () => {
      renderRoutes(controltowerRoutes);
      await cta('Review 1 draft', '/controltower/specs');
    });

    it('pluralises the drafts', async () => {
      ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, { ...SPEC_DRAFT, id: 's3' }]);
      renderRoutes(controltowerRoutes);
      await cta('Review 2 drafts', '/controltower/specs');
    });

    it('goes to dispatch when specs are ready', async () => {
      ct.listControlTowerSpecs.mockResolvedValue([SPEC_DISPATCHED]);
      renderRoutes(controltowerRoutes);
      await cta('Go to dispatch', '/controltower/queue');
    });
  });

  describe('checklist', () => {
    it('links every step and highlights the first open one', async () => {
      ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT]);
      renderRoutes(controltowerRoutes);
      const specs = await screen.findByRole('link', { name: /Generate and review/ });
      await waitFor(() => expect(specs).toHaveAttribute('aria-current', 'step'));
      expect(specs).toHaveAttribute('href', '/controltower/specs');
      expect(screen.getByRole('link', { name: /Connect a repository/ })).toHaveAttribute(
        'href',
        '/project-settings/controltower-repository',
      );
      expect(screen.getByRole('link', { name: /Interview with adaptive/ })).toHaveAttribute(
        'href',
        '/controltower/interviews',
      );
      expect(screen.getByRole('link', { name: /Approve specs/ })).toHaveAttribute(
        'href',
        '/controltower/queue',
      );
    });

    it('marks finished steps as done', async () => {
      renderRoutes(controltowerRoutes);
      const item = (
        await screen.findByRole('link', { name: /Create project and feature/ })
      ).closest('li')!;
      await waitFor(() => expect(within(item).getByText('Done')).toBeInTheDocument());
      expect(
        within(screen.getByRole('link', { name: /Generate and review/ }).closest('li')!).getByText(
          'Done',
        ),
      ).toBeInTheDocument();
    });
  });
});

describe('tab badges', () => {
  it('shows the drafts on Specifications and the ready specs on the queue', async () => {
    renderRoutes(controltowerRoutes);
    expect(await screen.findByRole('link', { name: 'Specifications 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dispatch queue 1' })).toBeInTheDocument();
  });

  it('hides a badge at zero and while loading', async () => {
    ct.listControlTowerSpecs.mockResolvedValue([SPEC_DISPATCHED]);
    ct.getControlTowerQueueProposal.mockReturnValue(new Promise(() => undefined));
    renderRoutes(controltowerRoutes);
    await screen.findByText('demo-repo');
    await waitFor(() => expect(ct.listControlTowerSpecs).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Specifications' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dispatch queue' })).toBeInTheDocument();
  });

  it('has no badges without a project', async () => {
    renderRoutes(controltowerRoutes, { path: '/controltower/templates', project: null });
    await screen.findByText('Standard project');
    expect(screen.getByRole('link', { name: 'Specifications' })).toBeInTheDocument();
  });
});
