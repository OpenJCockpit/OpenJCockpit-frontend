import { describe, expect, it } from 'vitest';
import { PROJECTS_PATH } from '@openjcockpit/hub-contract';
import { isAppDefinition } from '@openjcockpit/hub-contract';
import { projectsApp } from './projectsApp';

describe('projectsApp', () => {
  it('is a valid app that shows in the nav for everyone signed in', () => {
    expect(isAppDefinition(projectsApp)).toBe(true);
    expect(projectsApp).toMatchObject({
      route: PROJECTS_PATH,
      showInNav: true,
      requiredPermissions: [],
    });
  });

  it('loads its routes', async () => {
    expect(await projectsApp.loadRoutes()).toHaveLength(2);
  });

  it('contributes Overview, General and Repository to the project settings', () => {
    const sections = projectsApp.settings ?? [];
    expect(sections.map((s) => [s.id, s.screen, s.requiresProject])).toEqual([
      ['overview', 'project', true],
      ['general', 'project', true],
      ['repository', 'project', true],
    ]);
    expect(sections.find((s) => s.id === 'overview')?.requiredPermissions).toEqual([]);
    const editing = sections.filter((s) => s.id !== 'overview');
    expect(editing.every((s) => s.requiredPermissions.includes('openjcockpit-admin'))).toBe(true);
  });

  it('loads each settings section as a component', async () => {
    for (const section of projectsApp.settings ?? []) {
      expect((await section.component()).default).toBeTypeOf('function');
    }
  });
});
