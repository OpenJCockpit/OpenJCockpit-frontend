import { describe, expect, it } from 'vitest';
import { isAppDefinition } from '@openjcockpit/hub-contract';
import { controltowerApp } from './index';
import { controltowerRoutes } from './controltowerRoutes';

describe('controltowerApp', () => {
  it('is a valid app definition with a widget and two settings sections', () => {
    expect(isAppDefinition(controltowerApp)).toBe(true);
    expect(controltowerApp).toMatchObject({ id: 'controltower', route: '/controltower' });
    expect(controltowerApp.requiredPermissions).toEqual([]);
    expect(controltowerApp.widgets?.[0]?.link).toBe('/controltower/queue');
    const [repository, policy] = controltowerApp.settings ?? [];
    expect(repository).toMatchObject({ screen: 'project', requiresProject: true });
    expect(policy).toMatchObject({ requiredPermissions: ['openjcockpit-admin'] });
  });

  it('loads its routes and every lazy component', async () => {
    expect(await controltowerApp.loadRoutes()).toBe(controltowerRoutes);
    for (const section of controltowerApp.settings ?? []) {
      expect((await section.component()).default).toBeTypeOf('function');
    }
    expect((await controltowerApp.widgets![0]!.component()).default).toBeTypeOf('function');
  });
});
