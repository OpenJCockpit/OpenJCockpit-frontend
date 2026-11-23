import { useState } from 'react';
import { checkGitConnection } from '@openjcockpit/api';
import type {
  GitConnectionCheckResult,
  ProjectGitCredentialRequest,
  ProjectRequest,
} from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useCreateProject } from './useCreateProject';

export type { CreateStepId, CreateStepState } from './useCreateProject';

export const WIZARD_STEPS = ['basics', 'repository', 'integrations', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export type RepositoryMode = 'new' | 'existing';

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

/** Text fields the wizard always holds as strings: it starts from EMPTY_BASICS and its inputs only write strings. */
type WizardForm = ProjectRequest &
  Record<
    'customerId' | 'description' | 'owner' | 'environment' | 'gitUrl' | 'defaultBranch',
    string
  >;
type WizardCredentials = ProjectGitCredentialRequest &
  Record<'username' | 'secret' | 'githubApiUrl', string>;

export type WizardErrors = Partial<Record<'name' | 'gitUrl', string>>;

/**
 * State of the create-project wizard: the entered data, per-step validation and the Test connection
 * call. The create sequence at the end lives in `useCreateProject`.
 */
export function useProjectWizard() {
  const { t } = useTranslation('project');
  const [stepIndex, setStepIndex] = useState(0);
  const [rawForm, setForm] = useState<ProjectRequest>(EMPTY_BASICS);
  const form = rawForm as WizardForm;
  const [mode, setMode] = useState<RepositoryMode>('existing');
  const [rawCredentials, setCredentials] = useState<ProjectGitCredentialRequest>(EMPTY_CREDENTIALS);
  const credentials = rawCredentials as WizardCredentials;
  const [initSpecs, setInitSpecs] = useState(false);
  const [errors, setErrors] = useState<WizardErrors>({});

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<GitConnectionCheckResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const step = WIZARD_STEPS[stepIndex]!;
  const isNewRepo = mode === 'new';
  const hasCredentials = !isNewRepo && credentials.credentialType !== 'NONE';
  const dirty =
    form.name !== '' ||
    form.description !== '' ||
    form.owner !== '' ||
    form.environment !== '' ||
    form.customerId !== '' ||
    form.gitUrl !== '' ||
    credentials.secret !== '';

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
    if (target === 'repository' && !isNewRepo && !form.gitUrl.trim()) {
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
          gitUrl: form.gitUrl.trim(),
          credentialType: credentials.credentialType,
          username: credentials.username || undefined,
          secret: credentials.secret || null,
          githubApiUrl: credentials.githubApiUrl || undefined,
        }),
      );
    } catch {
      setTestError(t('wizard.repository.testFailed'));
    } finally {
      setTesting(false);
    }
  }

  const create = useCreateProject({
    form,
    credentials,
    setCredentials,
    isNewRepo,
    hasCredentials,
    initSpecs,
  });

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
    ...create,
  };
}

export type ProjectWizardState = ReturnType<typeof useProjectWizard>;
