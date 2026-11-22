import { Fragment, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  DASHBOARD_PATH,
  PROJECTS_PATH,
  PROJECT_SETTINGS_PATH,
  useHubHeader,
  useHubProject,
} from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  CheckboxField,
  HubPage,
  Icon,
  SelectField,
  StatusMessage,
  TextField,
  fieldErrorClass,
  fieldHintClass,
  formActionsClass,
  formGridClass,
  useConfirmDialog,
} from '@openjcockpit/ui';
import type { ProjectGitCredentialRequest } from '@openjcockpit/api';
import { GeneralFields } from '../forms/ProjectFields';
import { WithTranslations } from '../registerTranslations';
import { WIZARD_STEPS, useProjectWizard } from './useProjectWizard';
import type { CreateStepId, ProjectWizardState } from './useProjectWizard';
import styles from './ProjectWizard.module.scss';

const CREDENTIAL_TYPES = [
  'NONE',
  'HTTPS_TOKEN',
  'GITHUB_PAT',
  'USERNAME_PASSWORD',
  'GITHUB_APP',
] as const;

function Stepper({ current }: { current: number }) {
  const { t } = useTranslation('project');
  return (
    <ol className={styles.stepper} aria-label={t('wizard.stepsLabel')}>
      {WIZARD_STEPS.map((id, index) => (
        <li
          key={id}
          className={index === current ? styles.stepperCurrent : styles.stepperItem}
          aria-current={index === current ? 'step' : undefined}
        >
          {index + 1}. {t(`wizard.steps.${id}`)}
        </li>
      ))}
    </ol>
  );
}

function BasicsStep({ wizard }: { wizard: ProjectWizardState }) {
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (wizard.errors.name) nameRef.current?.focus();
  }, [wizard.errors.name]);
  return (
    <div className={formGridClass}>
      <GeneralFields
        form={wizard.form}
        onChange={wizard.updateForm}
        nameInvalid={!!wizard.errors.name}
        nameError={wizard.errors.name}
        nameInputRef={nameRef}
      />
    </div>
  );
}

function RepositoryStep({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  const { form, credentials, errors, testResult } = wizard;
  const status = testResult?.gitStatus;
  return (
    <>
      <div className={formGridClass}>
        <SelectField
          label={t('wizard.repository.mode')}
          value={wizard.mode}
          onChange={(v) => wizard.chooseMode(v === 'new' ? 'new' : 'existing')}
          options={[
            { value: 'existing', label: t('wizard.repository.existing') },
            { value: 'new', label: t('wizard.repository.new') },
          ]}
        />
        {wizard.isNewRepo ? (
          <p className={fieldHintClass}>{t('wizard.repository.newHint')}</p>
        ) : (
          <>
            <TextField
              label={t('form.gitUrl')}
              value={form.gitUrl ?? ''}
              onChange={(v) => wizard.updateForm((f) => ({ ...f, gitUrl: v }))}
              placeholder={t('form.gitUrlPlaceholder')}
              required
              error={errors.gitUrl}
              errorId="project-git-url-error"
              aria-invalid={errors.gitUrl ? true : undefined}
            />
            <TextField
              label={t('form.branch')}
              value={form.defaultBranch ?? ''}
              onChange={(v) => wizard.updateForm((f) => ({ ...f, defaultBranch: v }))}
              placeholder={t('form.branchPlaceholder')}
            />
            <SelectField
              label={t('credentials.type')}
              value={credentials.credentialType}
              onChange={(v) =>
                wizard.updateCredentials((c) => ({
                  ...c,
                  credentialType: v as ProjectGitCredentialRequest['credentialType'],
                }))
              }
              options={CREDENTIAL_TYPES.map((type) => ({
                value: type,
                label: t(`credentials.types.${type}`),
              }))}
            />
            <TextField
              label={t('credentials.username')}
              value={credentials.username ?? ''}
              onChange={(v) => wizard.updateCredentials((c) => ({ ...c, username: v }))}
              placeholder={t('credentials.usernamePlaceholder')}
            />
            <TextField
              label={t('credentials.secret')}
              type="password"
              autoComplete="new-password"
              value={credentials.secret ?? ''}
              onChange={(v) => wizard.updateCredentials((c) => ({ ...c, secret: v }))}
            />
            <TextField
              label={t('credentials.githubApiUrl')}
              value={credentials.githubApiUrl ?? ''}
              onChange={(v) => wizard.updateCredentials((c) => ({ ...c, githubApiUrl: v }))}
              placeholder={t('credentials.githubApiUrlPlaceholder')}
            />
          </>
        )}
      </div>
      {!wizard.isNewRepo && (
        <>
          <div className={formActionsClass}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void wizard.testConnection()}
              disabled={wizard.testing}
            >
              {wizard.testing && <Icon name="spinner" />} {t('wizard.repository.test')}
            </Button>
          </div>
          <div aria-live="polite">
            {status === 'ACCESSIBLE' && (
              <StatusMessage>{t('wizard.repository.testOk')}</StatusMessage>
            )}
            {status && status !== 'ACCESSIBLE' && (
              <p role="alert" className={fieldErrorClass}>
                {testResult?.message || t('wizard.repository.testNotReachable')}
              </p>
            )}
            {wizard.testError && (
              <p role="alert" className={fieldErrorClass}>
                {wizard.testError}
              </p>
            )}
            {!!testResult?.warnings.length && (
              <ul className={styles.warnings}>
                {testResult.warnings.map((warning) => (
                  <li key={warning} className={fieldHintClass}>
                    {t(`wizard.repository.warnings.${warning}`, {
                      defaultValue: t('wizard.repository.warnings.unknown'),
                    })}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className={fieldHintClass}>{t('wizard.repository.testHint')}</p>
        </>
      )}
    </>
  );
}

function IntegrationsStep({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  return (
    <div className={formGridClass}>
      <CheckboxField
        label={t('wizard.integrations.specInit')}
        hint={wizard.isNewRepo ? t('wizard.integrations.specInitNeedsRepo') : undefined}
        checked={wizard.initSpecs}
        disabled={wizard.isNewRepo}
        onChange={wizard.setInitSpecs}
      />
      <p className={fieldHintClass}>{t('wizard.integrations.later')}</p>
    </div>
  );
}

function ReviewStep({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  const { form } = wizard;
  const rows: [string, string][] = [
    [t('form.name'), form.name.trim()],
    [t('form.description'), form.description ?? ''],
    [t('form.owner'), form.owner ?? ''],
    [t('form.environment'), form.environment ?? ''],
    [t('form.customerId'), form.customerId ?? ''],
    [
      t('wizard.review.repository'),
      wizard.isNewRepo
        ? t('wizard.repository.new')
        : `${(form.gitUrl ?? '').trim()} (${form.defaultBranch || 'main'})`,
    ],
    [
      t('credentials.type'),
      wizard.isNewRepo ? '' : t(`credentials.types.${wizard.credentials.credentialType}`),
    ],
    [
      t('wizard.review.specInit'),
      wizard.initSpecs ? t('wizard.review.yes') : t('wizard.review.no'),
    ],
  ];
  return (
    <dl className={styles.summary}>
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <Fragment key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
    </dl>
  );
}

function Progress({ wizard }: { wizard: ProjectWizardState }) {
  const { t } = useTranslation('project');
  const ids: CreateStepId[] = ['create', 'credentials', 'gitCheck', 'specInit'];
  return (
    <ul className={styles.progress} aria-label={t('wizard.progress.label')}>
      {ids.map((id) => (
        <li key={id}>
          {t(`wizard.progress.${id}`)}: {t(`wizard.progress.state.${wizard.steps[id]}`)}
        </li>
      ))}
    </ul>
  );
}

/** The `/projects/new` page: basics, repository, integrations, then create with a visible result per call. */
export function ProjectWizard() {
  const { t } = useTranslation('project');
  const navigate = useNavigate();
  const header = useHubHeader();
  const { select } = useHubProject();
  const wizard = useProjectWizard();
  const { confirm, dialog } = useConfirmDialog();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Moves focus to the step heading on Next/Back, but not on first render.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [wizard.step, wizard.finished]);

  function leave() {
    void navigate(PROJECTS_PATH);
  }

  function cancel() {
    if (!wizard.dirty || wizard.started) {
      leave();
      return;
    }
    confirm({
      title: t('wizard.leave.title'),
      message: t('wizard.leave.message'),
      confirmLabel: t('wizard.leave.confirm'),
      cancelLabel: t('confirm.cancel'),
      busyLabel: t('confirm.working'),
      tone: 'primary',
      onConfirm: leave,
    });
  }

  function openProject() {
    if (!wizard.created) return;
    select(wizard.created.id);
    void navigate(DASHBOARD_PATH);
  }

  function openSettings() {
    if (!wizard.created) return;
    select(wizard.created.id);
    void navigate(`${PROJECT_SETTINGS_PATH}/general`);
  }

  const onReview = wizard.step === 'review';
  const heading = wizard.finished
    ? t('wizard.done.title')
    : wizard.started
      ? t('wizard.creating')
      : t(`wizard.steps.${wizard.step}`);

  return (
    <HubPage
      eyebrow={t('page.eyebrow')}
      title={t('wizard.title')}
      subtitle={t('wizard.subtitle')}
      header={header}
      onBack={cancel}
      backTitle={t('wizard.backToProjects')}
    >
      {!wizard.started && <Stepper current={wizard.stepIndex} />}
      <h2 ref={headingRef} tabIndex={-1} className={styles.stepHeading}>
        {heading}
      </h2>

      {wizard.finished ? (
        <>
          <Progress wizard={wizard} />
          <StatusMessage>
            {t('wizard.done.message', { name: wizard.created?.name ?? '' })}
          </StatusMessage>
          <div className={formActionsClass}>
            <Button variant="primary" onClick={openProject}>
              {t('wizard.done.open')}
            </Button>
            <Button variant="secondary" onClick={openSettings}>
              {t('wizard.done.settings')}
            </Button>
          </div>
        </>
      ) : wizard.started ? (
        <>
          <Progress wizard={wizard} />
          {wizard.createError && (
            <p role="alert" className={fieldErrorClass}>
              {wizard.created
                ? t('wizard.partial', { name: wizard.created.name })
                : t('wizard.errors.create')}{' '}
              {wizard.createError}
            </p>
          )}
          <div className={formActionsClass}>
            <Button
              variant="primary"
              onClick={() => void wizard.submit()}
              disabled={wizard.running}
            >
              {wizard.running && <Icon name="spinner" />} {t('wizard.retry')}
            </Button>
            {wizard.created && !wizard.running && (
              <Button variant="secondary" onClick={wizard.continueAnyway}>
                {t('wizard.continueAnyway')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (onReview) void wizard.submit();
            else wizard.next();
          }}
          noValidate
        >
          {wizard.step === 'basics' && <BasicsStep wizard={wizard} />}
          {wizard.step === 'repository' && <RepositoryStep wizard={wizard} />}
          {wizard.step === 'integrations' && <IntegrationsStep wizard={wizard} />}
          {onReview && <ReviewStep wizard={wizard} />}
          <div className={formActionsClass}>
            {wizard.stepIndex > 0 && (
              <Button type="button" variant="secondary" onClick={wizard.back}>
                {t('wizard.back')}
              </Button>
            )}
            <Button variant="primary" type="submit" disabled={wizard.running}>
              {onReview ? t('wizard.create') : t('wizard.next')}
            </Button>
            <Button type="button" variant="secondary" onClick={cancel}>
              {t('form.cancel')}
            </Button>
          </div>
        </form>
      )}
      {dialog}
    </HubPage>
  );
}

export default function ProjectWizardRoute() {
  return (
    <WithTranslations>
      <ProjectWizard />
    </WithTranslations>
  );
}
