import { describe, expect, it } from 'vitest';
import { HUB_CONTRACT_VERSION, isAppDefinition } from '@openjcockpit/hub-contract';
import { app, contractVersion } from './app-entry';

// The host loads this module as `skillsHub/app` and reads `app` and `contractVersion`.
describe('remote-skills-hub entry', () => {
  it('exposes a valid app definition the host will accept', () => {
    expect(isAppDefinition(app)).toBe(true);
    expect(app.id).toBe('skills-hub');
  });

  it('serves the skills hub on its route', async () => {
    expect(app.route).toBe('/skills-hub');
    const routes = await app.loadRoutes();
    expect(routes.length).toBeGreaterThan(0);
  });

  it('reports the hub contract version it was built against', () => {
    expect(contractVersion).toBe(HUB_CONTRACT_VERSION);
  });
});
