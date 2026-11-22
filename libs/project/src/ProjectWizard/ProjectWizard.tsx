import { useEffect, useRef } from 'react';
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
  HubPage,
  Icon,
  Panel,
  PanelBody,
  StatusMessage,
  fieldErrorClass,
  formActionsClass,
  useConfirmDialog,
} from '@openjcockpit/ui';
import type { Project } from '@openjcockpit/api';
import { WithTranslations } from '../registerTranslations';
import { RepositoryStep } from './RepositoryStep';
import { BasicsStep, IntegrationsStep, Progress, ReviewStep, Stepper } from './WizardSteps';
import { useProjectWizard } from './useProjectWizard';
import styles from './ProjectWizard.module.scss';

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
  }, [wizard.step, wizard.completed]);

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

  function openProject(created: Project) {
    select(created.id);
    void navigate(DASHBOARD_PATH);
  }

  function openSettings(created: Project) {
    select(created.id);
    void navigate(`${PROJECT_SETTINGS_PATH}/general`);
  }

  const onReview = wizard.step === 'review';
  const done = wizard.completed;
  const heading = done
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
      <Panel as="section">
        <PanelBody className={styles.body}>
          {!wizard.started && <Stepper current={wizard.stepIndex} />}
          <h2 ref={headingRef} tabIndex={-1} className={styles.stepHeading}>
            {heading}
          </h2>

          {done ? (
            <>
              <Progress wizard={wizard} />
              <StatusMessage>{t('wizard.done.message', { name: done.name })}</StatusMessage>
              <div className={formActionsClass}>
                <Button variant="primary" onClick={() => openProject(done)}>
                  {t('wizard.done.open')}
                </Button>
                <Button variant="secondary" onClick={() => openSettings(done)}>
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
        </PanelBody>
      </Panel>
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
