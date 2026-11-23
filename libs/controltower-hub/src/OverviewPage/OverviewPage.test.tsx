import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../controltowerRoutes';
import { ct, INTERVIEW, renderRoutes, SPEC_DISPATCHED, SPEC_DRAFT } from '../testUtils';

const GENERATED = { ...INTERVIEW, status: 'GENERATED' as const };

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
    expect(within(stat('Needs review')).getByText('1')).toBeInTheDocument();
    expect(stat('Needs review')).toHaveAttribute('href', '/controltower/specs?status=DRAFT');
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

  describe('primary button', () => {
    const cta = (name: string, href: string) =>
      expect(screen.findByRole('link', { name })).resolves.toHaveAttribute('href', href);

    it('asks for a template when there is none', async () => {
      ct.listControlTowerTemplates.mockResolvedValue([]);
      renderRoutes(controltowerRoutes);
      await cta('Create a template', '/controltower/templates');
    });

    it('resumes the one active interview', async () => {
      renderRoutes(controltowerRoutes);
      await cta('Resume interview', '/controltower/interviews/i1');
    });

    it('lets the user pick when several interviews are active', async () => {
      ct.listControlTowerInterviews.mockResolvedValue([INTERVIEW, { ...INTERVIEW, id: 'i2' }]);
      renderRoutes(controltowerRoutes);
      await cta('Resume interview', '/controltower/interviews');
    });

    it('generates specs for a completed interview', async () => {
      ct.listControlTowerInterviews.mockResolvedValue([{ ...INTERVIEW, status: 'COMPLETE' }]);
      renderRoutes(controltowerRoutes);
      await cta('Generate specs', '/controltower/interviews/i1');
    });

    it('confirms dispatched specs when nothing else waits', async () => {
      ct.listControlTowerInterviews.mockResolvedValue([GENERATED]);
      ct.listControlTowerSpecs.mockResolvedValue([SPEC_DISPATCHED]);
      ct.getControlTowerQueueProposal.mockResolvedValue([]);
      renderRoutes(controltowerRoutes);
      await cta('Confirm 1 spec done', '/controltower/specs?status=DISPATCHED');
    });

    it('starts discovery when there are no specs', async () => {
      ct.listControlTowerInterviews.mockResolvedValue([GENERATED]);
      ct.listControlTowerSpecs.mockResolvedValue([]);
      renderRoutes(controltowerRoutes);
      await cta('Start discovery', '/controltower/interviews');
    });

    it('reviews the drafts', async () => {
      ct.listControlTowerInterviews.mockResolvedValue([GENERATED]);
      renderRoutes(controltowerRoutes);
      await cta('Review 1 draft', '/controltower/specs');
    });

    it('pluralises the drafts', async () => {
      ct.listControlTowerInterviews.mockResolvedValue([GENERATED]);
      ct.listControlTowerSpecs.mockResolvedValue([SPEC_DRAFT, { ...SPEC_DRAFT, id: 's3' }]);
      renderRoutes(controltowerRoutes);
      await cta('Review 2 drafts', '/controltower/specs');
    });

    it('goes to dispatch when specs are ready', async () => {
      ct.listControlTowerInterviews.mockResolvedValue([GENERATED]);
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
      // Finished steps fold into "Getting started" once the project is under way.
      fireEvent.click(await screen.findByText('Getting started'));
      const link = (name: RegExp) => screen.getByRole('link', { name }).closest('li')!;
      expect(within(link(/Create project and feature/)).getByText('Done')).toBeInTheDocument();
      expect(within(link(/Generate and review/)).getByText('Done')).toBeInTheDocument();
    });
  });
});

describe('pipeline', () => {
  it('leads with the stage counts once the project is under way', async () => {
    renderRoutes(controltowerRoutes);
    const pipeline = await screen.findByRole('list', { name: 'Specification pipeline' });
    const stage = (name: string) => within(pipeline).getByText(name).closest('a')!;
    expect(stage('Drafts')).toHaveAttribute('href', '/controltower/specs?status=DRAFT');
    expect(stage('Approved')).toHaveAttribute('href', '/controltower/specs?status=APPROVED');
    expect(stage('Dispatched')).toHaveAttribute('href', '/controltower/specs?status=DISPATCHED');
    expect(stage('Done')).toHaveAttribute('href', '/controltower/specs?status=DONE');
  });

  it('shows the full checklist and no pipeline for a new project', async () => {
    ct.listControlTowerInterviews.mockResolvedValue([]);
    ct.listControlTowerSpecs.mockResolvedValue([]);
    renderRoutes(controltowerRoutes);
    await screen.findByRole('link', { name: /Generate and review/ });
    await waitFor(() => expect(ct.listControlTowerSpecs).toHaveBeenCalled());
    expect(screen.queryByRole('list', { name: 'Specification pipeline' })).not.toBeInTheDocument();
    expect(screen.queryByText('Getting started')).not.toBeInTheDocument();
  });
});

describe('tab badges', () => {
  it('shows the drafts on Specifications and the ready specs on the queue', async () => {
    renderRoutes(controltowerRoutes);
    expect(await screen.findByRole('link', { name: /^Specifications\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Dispatch queue\s*1$/ })).toBeInTheDocument();
  });

  it('shows the interviews in progress on Discovery interviews', async () => {
    renderRoutes(controltowerRoutes);
    expect(
      await screen.findByRole('link', { name: /^Discovery interviews\s*1$/ }),
    ).toBeInTheDocument();
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
