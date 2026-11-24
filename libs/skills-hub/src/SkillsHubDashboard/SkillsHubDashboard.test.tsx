import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillsHubDashboard } from './SkillsHubDashboard';
import { clickAsync, renderAsync } from '../testUtils';
import { mockCatalog } from './catalogFixture';

vi.mock('@openjcockpit/api', async (importOriginal) =>
  (await import('../testUtils')).automockApiClients(await importOriginal()),
);

beforeEach(() => {
  mockCatalog();
});

describe('SkillsHubDashboard — Settings entry point', () => {
  it('renders the Settings control as a real button, not a dead anchor', async () => {
    await renderAsync(<SkillsHubDashboard onBack={vi.fn()} onSettings={vi.fn()} />);

    const settingsControl = screen.getByRole('button', { name: 'Settings' });
    expect(settingsControl.tagName).toBe('BUTTON');
    expect(settingsControl).not.toHaveAttribute('href');
  });

  it('invokes onSettings when the Settings control is activated', async () => {
    const onSettings = vi.fn();
    await renderAsync(<SkillsHubDashboard onBack={vi.fn()} onSettings={onSettings} />);

    await clickAsync(screen.getByRole('button', { name: 'Settings' }));

    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it('invokes onBack when the back control is activated', async () => {
    const onBack = vi.fn();
    await renderAsync(<SkillsHubDashboard onBack={onBack} onSettings={vi.fn()} />);

    await clickAsync(screen.getByRole('button', { name: 'Back to dashboard' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
