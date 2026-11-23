import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  createProject,
  initSpecFolder,
  saveGitCredentials,
  triggerGitCheck,
} from '@openjcockpit/api';
import type { Project, ProjectGitCredentialRequest, ProjectRequest } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useProjectCache } from '../projectCache';

/** The calls of the create sequence, in order. */
export type CreateStepId = 'create' | 'credentials' | 'gitCheck' | 'specInit';
export type CreateStepState = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

type StepStates = Record<CreateStepId, CreateStepState>;

const IDLE: StepStates = {
  create: 'pending',
  credentials: 'pending',
  gitCheck: 'pending',
  specInit: 'pending',
};

interface Options {
  form: ProjectRequest & Record<'name' | 'gitUrl', string>;
  credentials: ProjectGitCredentialRequest & Record<'secret', string>;
  setCredentials: Dispatch<SetStateAction<ProjectGitCredentialRequest>>;
  isNewRepo: boolean;
  hasCredentials: boolean;
  initSpecs: boolean;
}

/**
 * The create sequence of the wizard: the project, then its credentials, git check and spec folder,
 * with a state per call. The project is created only once; a failure after that keeps the created
 * project so a retry never creates a duplicate.
 */
export function useCreateProject({
  form,
  credentials,
  setCredentials,
  isNewRepo,
  hasCredentials,
  initSpecs,
}: Options) {
  const { t } = useTranslation('project');
  const updateProjects = useProjectCache();
  const [steps, setSteps] = useState<StepStates>(IDLE);
  const [running, setRunning] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<Project | null>(null);
  // Set once every call succeeded, or the user chose to carry on after a failed one.
  const [finished, setFinished] = useState(false);
  // Mirrors `created` and `steps` for retries, which run in a new closure.
  const createdRef = useRef<Project | null>(null);
  const stepsRef = useRef<StepStates>(IDLE);

  function mark(id: CreateStepId, state: CreateStepState) {
    stepsRef.current = { ...stepsRef.current, [id]: state };
    setSteps(stepsRef.current);
  }

  /** Runs one call of the sequence unless it is already done; resolves true when the sequence may go on. */
  async function runStep(id: CreateStepId, skip: boolean, call: () => Promise<unknown>) {
    if (stepsRef.current[id] === 'done' || stepsRef.current[id] === 'skipped') return true;
    if (skip) {
      mark(id, 'skipped');
      return true;
    }
    mark(id, 'running');
    try {
      await call();
      mark(id, 'done');
      return true;
    } catch (err) {
      mark(id, 'failed');
      setCreateError(err instanceof Error && err.message ? err.message : t(`wizard.errors.${id}`));
      return false;
    }
  }

  /** Creates the project, then the calls that depend on it. Safe to call again after a failure. */
  async function submit() {
    setRunning(true);
    setCreateError(null);
    try {
      const ok = await runStep('create', false, async () => {
        const project = await createProject({
          ...form,
          name: form.name.trim(),
          gitUrl: isNewRepo ? '' : form.gitUrl.trim(),
          newProject: isNewRepo ? 1 : 0,
        });
        createdRef.current = project;
        setCreated(project);
        updateProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
      });
      if (!ok) return;
      const project = createdRef.current!;

      const credentialsOk = await runStep('credentials', !hasCredentials, async () => {
        await saveGitCredentials(project.id, {
          ...credentials,
          secret: credentials.secret || null,
        });
        updateProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, hasCredentials: true } : p)),
        );
        // The secret is not kept once it is stored.
        setCredentials((c) => ({ ...c, secret: '' }));
      });
      if (!credentialsOk) return;

      const checkOk = await runStep('gitCheck', isNewRepo, async () => {
        const status = await triggerGitCheck(project.id);
        updateProjects((prev) =>
          prev.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  gitStatus: status.gitStatus,
                  gitStatusCheckedAt: status.gitStatusCheckedAt,
                  gitStatusMessage: status.gitStatusMessage,
                }
              : p,
          ),
        );
        if (status.gitStatus !== 'ACCESSIBLE') throw new Error(t('wizard.errors.gitCheck'));
      });
      if (!checkOk) return;

      if (!(await runStep('specInit', !initSpecs, () => initSpecFolder(project.id)))) return;
      setFinished(true);
    } finally {
      setRunning(false);
    }
  }

  /** "Continue anyway": the project exists; the failed call can be redone from its settings. */
  function continueAnyway() {
    setCreateError(null);
    setFinished(true);
  }

  const completed = finished ? created : null;
  const failedStep = (Object.keys(steps) as CreateStepId[]).find((id) => steps[id] === 'failed');

  return {
    steps,
    running,
    started: steps.create !== 'pending',
    failedStep,
    createError,
    created,
    finished,
    completed,
    submit,
    continueAnyway,
  };
}
