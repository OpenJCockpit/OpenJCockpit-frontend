import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withI18n } from '@openjcockpit/i18n/testing';
import { appResources } from '../i18nResources';
import { RemoteAppsProvider } from '../federation/RemoteApps';
import { clickAsync } from '../testUtils/dom';
import { RemoteFailuresNotice } from './RemoteFailuresNotice';

function renderNotice(failed: string[]) {
  return render(
    withI18n(
      <RemoteAppsProvider remotes={{ apps: [], failed }}>
        <RemoteFailuresNotice />
      </RemoteAppsProvider>,
      appResources,
    ),
  );
}

describe('RemoteFailuresNotice', () => {
  it('renders nothing when every remote loaded', () => {
    renderNotice([]);
    expect(screen.queryByTestId('remote-failures')).not.toBeInTheDocument();
  });

  it('names the failed remotes and can be dismissed', async () => {
    renderNotice(['controltower', 'quality']);
    const notice = screen.getByTestId('remote-failures');
    expect(notice).toHaveTextContent('Some apps are unavailable');
    expect(notice).toHaveTextContent('controltower, quality');
    await clickAsync(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('remote-failures')).not.toBeInTheDocument();
  });
});
