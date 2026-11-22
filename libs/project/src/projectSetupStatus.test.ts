import { describe, expect, it } from 'vitest';
import { project } from './testHub';
import { projectSetupStatus } from './projectSetupStatus';

const ready = project({ gitStatus: 'ACCESSIBLE', hasCredentials: true });

function states(result: ReturnType<typeof projectSetupStatus>) {
  return Object.fromEntries(result.items.map((item) => [item.id, item.state]));
}

describe('projectSetupStatus', () => {
  it('is complete when everything is set up and the spec folder exists', () => {
    const result = projectSetupStatus(ready, { pending: false });
    expect(states(result)).toEqual({
      basics: 'done',
      repository: 'done',
      credentials: 'done',
      specFolder: 'done',
    });
    expect(result).toMatchObject({ done: 4, total: 4, complete: true });
  });

  it('flags a fresh project with nothing configured', () => {
    const result = projectSetupStatus(
      project({ owner: undefined, environment: '', hasCredentials: false }),
      null,
    );
    expect(states(result)).toEqual({
      basics: 'todo',
      repository: 'todo',
      credentials: 'todo',
      specFolder: 'todo',
    });
    expect(result).toMatchObject({ done: 0, total: 4, complete: false });
  });

  it('treats a new project as having a repository and needing no credentials', () => {
    const result = projectSetupStatus(project({ newProject: 1, gitStatus: 'UNKNOWN' }), {
      pending: false,
    });
    expect(states(result)).toEqual({ basics: 'done', repository: 'done', specFolder: 'done' });
    expect(result.complete).toBe(true);
  });

  it('marks an open spec-init pull request as pending, not done', () => {
    const result = projectSetupStatus(ready, { pending: true });
    expect(states(result).specFolder).toBe('pending');
    expect(result).toMatchObject({ done: 3, total: 4, complete: false });
  });

  it('leaves the spec folder out of the count until its status is known', () => {
    const result = projectSetupStatus(ready);
    expect(states(result).specFolder).toBe('unknown');
    expect(result).toMatchObject({ done: 3, total: 3, complete: false });
  });

  it('points each item at the section that fixes it', () => {
    const sections = projectSetupStatus(ready, null).items.map((i) => [i.id, i.sectionId]);
    expect(sections).toEqual([
      ['basics', 'general'],
      ['repository', 'repository'],
      ['credentials', 'repository'],
      ['specFolder', 'spec-queue'],
    ]);
  });
});
