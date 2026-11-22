import type { Project, SpecInitStatus } from '@openjcockpit/api';

export type SetupItemId = 'basics' | 'repository' | 'credentials' | 'specFolder';

/** `todo`: needs action; `pending`: started and waiting (spec-init pull request open); `unknown`: not loaded yet. */
export type SetupItemState = 'done' | 'todo' | 'pending' | 'unknown';

export interface SetupItem {
  id: SetupItemId;
  state: SetupItemState;
  /** Settings section that fixes it: `/project-settings/<sectionId>`. */
  sectionId: string;
}

export interface ProjectSetupStatus {
  items: SetupItem[];
  /** Items that count towards completeness (`unknown` ones do not). */
  total: number;
  done: number;
  /** Every known item is done and nothing is unknown. */
  complete: boolean;
}

function filled(value: string | null | undefined): boolean {
  return !!value && value.trim() !== '';
}

/**
 * What is left to set up for a project. Computed on the client from the project and, when known,
 * the spec-init status (`undefined`: not loaded; `null`: never initialised).
 */
export function projectSetupStatus(
  project: Project,
  specInit?: SpecInitStatus | null,
): ProjectSetupStatus {
  const isNew = project.newProject === 1;
  const items: SetupItem[] = [
    {
      id: 'basics',
      sectionId: 'general',
      state:
        filled(project.name) && filled(project.owner) && filled(project.environment)
          ? 'done'
          : 'todo',
    },
    {
      id: 'repository',
      sectionId: 'repository',
      // A repository that does not exist yet cannot be checked: the project is flagged new instead.
      state: isNew || project.gitStatus === 'ACCESSIBLE' ? 'done' : 'todo',
    },
  ];
  // New projects have no repository to authenticate against yet.
  if (!isNew) {
    items.push({
      id: 'credentials',
      sectionId: 'repository',
      state: project.hasCredentials ? 'done' : 'todo',
    });
  }
  items.push({
    id: 'specFolder',
    sectionId: 'spec-queue',
    state:
      specInit === undefined
        ? 'unknown'
        : specInit === null
          ? 'todo'
          : specInit.pending
            ? 'pending'
            : 'done',
  });

  const counted = items.filter((item) => item.state !== 'unknown');
  const done = counted.filter((item) => item.state === 'done').length;
  return {
    items,
    total: counted.length,
    done,
    complete: counted.length === items.length && done === items.length,
  };
}
