import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { AppDefinition } from './appDefinition';
import { AppRegistryProvider } from './registry';
import {
  SettingsLeaveGuardContext,
  useSettingsLeaveGuard,
  type SettingsLeaveGuard,
} from './settingsGuard';
import { SettingsLink } from './settingsLink';
import { FakeHubSession, FakeHubSessionProvider } from './testing';

const app: AppDefinition = {
  id: 'x',
  labelKey: 'x',
  icon: 'x',
  route: '/x',
  order: 1,
  requiredPermissions: [],
  loadRoutes: () => Promise.resolve([]),
  settings: [
    {
      id: 'jira',
      sourceAppId: 'x',
      titleKey: 'jira',
      requiredPermissions: [],
      order: 1,
      component: () => Promise.resolve({ default: () => null }),
    },
  ],
};

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderLink(guard?: SettingsLeaveGuard) {
  const link = (
    <SettingsLink id="jira" data-testid="link">
      Jira
    </SettingsLink>
  );
  render(
    <MemoryRouter>
      <FakeHubSessionProvider session={new FakeHubSession([])}>
        <AppRegistryProvider apps={[app]}>
          {guard ? (
            <SettingsLeaveGuardContext.Provider value={guard}>
              {link}
            </SettingsLeaveGuardContext.Provider>
          ) : (
            link
          )}
          <Where />
        </AppRegistryProvider>
      </FakeHubSessionProvider>
    </MemoryRouter>,
  );
}

describe('SettingsLink leave guard', () => {
  it('navigates directly without a guard', () => {
    renderLink();
    fireEvent.click(screen.getByTestId('link'));
    expect(screen.getByTestId('where')).toHaveTextContent('/settings/jira');
  });

  it('defers navigation to the guard while edits are unsaved', () => {
    const confirmLeave = vi.fn();
    renderLink({ isDirty: () => true, confirmLeave });
    fireEvent.click(screen.getByTestId('link'));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(screen.getByTestId('where')).not.toHaveTextContent('/settings/jira');
    expect(confirmLeave).toHaveBeenCalledOnce();
    confirmLeave.mock.calls[0]?.[0]();
  });

  it('leaves modified clicks to the browser', () => {
    const confirmLeave = vi.fn();
    renderLink({ isDirty: () => true, confirmLeave });
    fireEvent.click(screen.getByTestId('link'), { ctrlKey: true });
    expect(confirmLeave).not.toHaveBeenCalled();
  });
});

describe('default leave guard', () => {
  it('reports clean and proceeds at once without a provider', () => {
    const proceed = vi.fn();
    const { result } = renderHook(() => useSettingsLeaveGuard());
    expect(result.current.isDirty()).toBe(false);
    result.current.confirmLeave(proceed);
    expect(proceed).toHaveBeenCalledOnce();
  });
});
