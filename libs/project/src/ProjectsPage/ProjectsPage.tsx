import { useLocation, useNavigate } from 'react-router';
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
  StatusMessage,
  fieldErrorClass,
  useConfirmDialog,
} from '@openjcockpit/ui';
import type { Project } from '@openjcockpit/api';
import { useProjectList } from '../useProjectList';
import { ProjectList } from './ProjectList';
import styles from './ProjectsPage.module.scss';

const NEW_PROJECT_PATH = `${PROJECTS_PATH}/new`;

/** Where the host sent the user from when it asked for a project, if it did. */
function redirectFrom(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('from' in state)) return undefined;
  return typeof state.from === 'string' ? state.from : undefined;
}

/** The `/projects` page: every project the user may see, with select, settings and (admins) on/off. */
export function ProjectsPage() {
  const { t } = useTranslation('project');
  const navigate = useNavigate();
  const location = useLocation();
  const header = useHubHeader();
  const { selected, select } = useHubProject();
  const { isAdmin, projects, loaded, error, toggleActive } = useProjectList();
  const { confirm, dialog } = useConfirmDialog();

  function handleSelect(project: Project) {
    select(project.id);
    void navigate(redirectFrom(location.state) ?? DASHBOARD_PATH, { replace: true });
  }

  function handleSettings(project: Project) {
    select(project.id);
    void navigate(`${PROJECT_SETTINGS_PATH}/general`);
  }

  function handleToggle(project: Project) {
    if (project.active !== 1) return void toggleActive(project);
    confirm({
      title: t('confirm.deactivate.title', { name: project.name }),
      message: t('confirm.deactivate.message'),
      confirmLabel: t('confirm.deactivate.confirm'),
      tone: 'primary',
      cancelLabel: t('confirm.cancel'),
      busyLabel: t('confirm.working'),
      onConfirm: () => toggleActive(project),
    });
  }

  return (
    <HubPage
      eyebrow={t('page.eyebrow')}
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      header={header}
      onBack={() => void navigate(DASHBOARD_PATH)}
      backTitle={t('page.back')}
    >
      {!loaded ? (
        <StatusMessage variant="loading">{t('settings.loading')}</StatusMessage>
      ) : (
        <>
          {isAdmin && (
            <div className={styles.toolbar}>
              <Button variant="primary" onClick={() => void navigate(NEW_PROJECT_PATH)}>
                {t('settings.newProject')}
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className={fieldErrorClass}>
              {error}
            </p>
          )}

          {projects.length === 0 ? (
            <StatusMessage data-testid="projects-empty">{t('page.empty')}</StatusMessage>
          ) : (
            <ProjectList
              projects={projects}
              selectedId={selected?.id ?? null}
              onSelect={handleSelect}
              onSettings={isAdmin ? handleSettings : undefined}
              onToggleActive={isAdmin ? handleToggle : undefined}
            />
          )}
        </>
      )}
      {dialog}
    </HubPage>
  );
}
