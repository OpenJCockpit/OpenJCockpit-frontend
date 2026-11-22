import { useRef, useState } from 'react';
import {
  checkGitConnection,
  createProject,
  initSpecFolder,
  saveGitCredentials,
  triggerGitCheck,
} from '@openjcockpit/api';
import type {
  GitConnectionCheckResult,
  Project,
  ProjectGitCredentialRequest,
  ProjectRequest,
} from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useProjectCache } from '../projectCache';

export const WIZARD_STEPS = ['basics', 'repository', 'integrations', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export type RepositoryMode = 'new' | 'existing';

/** The calls of the create sequence, in order. */
export type CreateStepId = 'create' | 'credentials' | 'gitCheck' | 'specInit';
export type CreateStepState = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

const EMPTY_BASICS: ProjectRequest = {
  name: '',
  customerId: '',
  description: '',
  owner: '',
  environment: '',
  gitUrl: '',
  defaultBranch: 'main',
  newProject: 0,
};

const EMPTY_CREDENTIALS: ProjectGitCredentialRequest = {
  credentialType: 'NONE',
  username: '',
  secret: '',
  githubApiUrl: '',
};

type StepStates = Record<CreateStepId, CreateStepState>;

const IDLE: StepStates = {
  create: 'pending',
  credentials: 'pending',
  gitCheck: 'pending',
  specInit: 'pending',
};

export type WizardErrors = Partial<Record<'name' | 'gitUrl', string>>;

/**
 * State of the create-project wizard: the entered data, per-step validation, the Test connection
 * call and the create sequence. The project is created only at the end; a failure after that keeps
 * the created project so a retry never creates a duplicate.
 */
export function useProjectWizard() {
  const { t } = useTranslation('project');
  const updateProjects = useProjectCache();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<ProjectRequest>(EMPTY_BASICS);
  const [mode, setMode] = useState<RepositoryMode>('existing');
  const [credentials, setCredentials] = useState<ProjectGitCredentialRequest>(EMPTY_CREDENTIALS);
  const [initSpecs, setInitSpecs] = useState(false);
  const [errors, setErrors] = useState<WizardErrors>({});

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<GitConnectionCheckResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [steps, setSteps] = useState<StepStates>(IDLE);
  const [running, setRunning] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<Project | null>(null);
  // Set once every call succeeded, or the user chose to carry on after a failed one.
  const [finished, setFinished] = useState(false);
  // Mirrors `created` and `steps` for retries, which run in a new closure.
  const createdRef = useRef<Project | null>(null);
  const stepsRef = useRef<StepStates>(IDLE);

  const step = WIZARD_STEPS[stepIndex]!;
  const isNewRepo = mode === 'new';
  const hasCredentials = !isNewRepo && credentials.credentialType !== 'NONE';
  const dirty =
    form.name !== '' ||
    form.description !== '' ||
    form.owner !== '' ||
    form.environment !== '' ||
    form.customerId !== '' ||
    (form.gitUrl ?? '') !== '' ||
    (credentials.secret ?? '') !== '';

  function resetTest() {
    // A tested result describes the URL and credentials as they were.
    setTestResult(null);
    setTestError(null);
  }

  function updateForm(updater: (f: ProjectRequest) => ProjectRequest) {
    setForm(updater);
    resetTest();
  }

  function updateCredentials(
    updater: (f: ProjectGitCredentialRequest) => ProjectGitCredentialRequest,
  ) {
    setCredentials(updater);
    resetTest();
  }

  function chooseMode(next: RepositoryMode) {
    setMode(next);
    resetTest();
    // Spec init needs a repository that exists.
    if (next === 'new') setInitSpecs(false);
  }

  function validate(target: WizardStep): WizardErrors {
    const found: WizardErrors = {};
    if (target === 'basics' && !form.name.trim()) found.name = t('wizard.errors.nameRequired');
    if (target === 'repository' && !isNewRepo && !(form.gitUrl ?? '').trim()) {
      found.gitUrl = t('wizard.errors.gitUrlRequired');
    }
    return found;
  }

  function next() {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return false;
    setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
    return true;
  }

  function back() {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function testConnection() {
    const found = validate('repository');
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setTesting(true);
    resetTest();
    try {
      setTestResult(
        await checkGitConnection({
          gitUrl: (form.gitUrl ?? '').trim(),
          credentialType: credentials.credentialType,
          username: credentials.username || undefined,
          secret: credentials.secret ? credentials.secret : null,
          githubApiUrl: credentials.githubApiUrl || undefined,
        }),
      );
    } catch {
      setTestError(t('wizard.repository.testFailed'));
    } finally {
      setTesting(false);
    }
  }

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
          gitUrl: isNewRepo ? '' : (form.gitUrl ?? '').trim(),
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
          secret: credentials.secret === '' ? null : credentials.secret,
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

  const failedStep = (Object.keys(steps) as CreateStepId[]).find((id) => steps[id] === 'failed');

  return {
    step,
    stepIndex,
    form,
    updateForm,
    mode,
    chooseMode,
    isNewRepo,
    credentials,
    updateCredentials,
    hasCredentials,
    initSpecs,
    setInitSpecs,
    errors,
    dirty,
    next,
    back,
    testing,
    testResult,
    testError,
    testConnection,
    steps,
    running,
    started: steps.create !== 'pending',
    failedStep,
    createError,
    created,
    finished,
    submit,
    continueAnyway,
  };
}

export type ProjectWizardState = ReturnType<typeof useProjectWizard>;
