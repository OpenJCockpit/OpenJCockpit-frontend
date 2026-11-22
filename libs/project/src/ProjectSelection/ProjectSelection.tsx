import type { GitStatus, Project } from '@openjcockpit/api';
import styles from './ProjectSelection.module.scss';
import { AppHeader, AppShell, Button, ErrorState, Icon, cx } from '@openjcockpit/ui';
import { useTranslation } from '@openjcockpit/i18n';
import gitStyles from '../GitStatusBadge/GitStatusBadge.module.scss';

interface Props {
  projects: Project[];
  onSelect: (project: Project) => void;
  /** Opens project management. Left out where management is not available, which hides its buttons. */
  onSettings?: () => void;
  onBack?: () => void;
  /** The project list could not be loaded: show an error with Retry instead of "no projects". */
  loadFailed?: boolean;
  onRetry?: () => void;
}

function GitStatusIndicator({ status }: { status: GitStatus }) {
  const { t } = useTranslation('project');
  if (status === 'ACCESSIBLE') {
    return (
      <span className={gitStyles.ok} aria-label={t('selection.repoReachable')}>
        {' '}
        <Icon name="check" />
      </span>
    );
  }
  if (status === 'NOT_ACCESSIBLE' || status === 'CHECK_FAILED') {
    return (
      <span className={gitStyles.error} aria-label={t('selection.repoNotReachable')}>
        {' '}
        <Icon name="close" />
      </span>
    );
  }
  return (
    <span className={gitStyles.unknown} aria-label={t('selection.statusUnknown')}>
      {' '}
      <Icon name="more" />
    </span>
  );
}

export function canSelectProject(project: Project): boolean {
  return (
    project.active === 1 &&
    (project.gitStatus === 'ACCESSIBLE' ||
      project.newProject === 1 ||
      project.gitStatus === 'UNKNOWN')
  );
}

export function ProjectSelection({
  projects,
  onSelect,
  onSettings,
  onBack,
  loadFailed,
  onRetry,
}: Props) {
  const { t } = useTranslation('project');
  const displayProjects = projects;

  return (
    <AppShell>
      <AppHeader
        onBack={onBack}
        backLabel={
          <>
            <Icon name="arrow-left" /> {t('selection.backToHub')}
          </>
        }
      />

      <main className={styles.projectSelectionContent}>
        <div className={styles.projectSelectionHeader}>
          <h1 className={styles.projectSelectionTitle}>{t('selection.title')}</h1>
          <p className={styles.projectSelectionSubtitle}>{t('selection.subtitle')}</p>
        </div>

        {loadFailed ? (
          <ErrorState onRetry={onRetry} retryLabel={t('selection.retry')}>
            {t('selection.loadFailed')}
          </ErrorState>
        ) : displayProjects.length === 0 ? (
          <div className={styles.projectEmpty}>
            <p data-testid="project-selection-empty">{t('selection.empty')}</p>
            {onSettings && (
              <Button variant="secondary" onClick={onSettings}>
                {t('selection.manageArrow')} <Icon name="arrow-right" />
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {displayProjects.map((project) => {
              const selectable = canSelectProject(project);
              const showNotAccessible =
                project.gitStatus === 'NOT_ACCESSIBLE' || project.gitStatus === 'CHECK_FAILED';
              return (
                <button
                  key={project.id}
                  className={cx(styles.projectCard, !selectable && styles.projectCardDisabled)}
                  onClick={() => selectable && onSelect(project)}
                  disabled={!selectable}
                  data-testid="project-card"
                >
                  <div className={styles.projectCardIcon}>
                    <Icon name="cube" />
                  </div>
                  <div className={styles.projectCardBody}>
                    <span className={styles.projectCardName}>
                      {project.name}
                      <GitStatusIndicator status={project.gitStatus} />
                    </span>
                    {project.description && (
                      <p className={styles.projectCardDesc}>{project.description}</p>
                    )}
                    <div className={styles.projectCardMeta}>
                      {project.environment && <span>{project.environment}</span>}
                      {project.owner && (
                        <span>{t('selection.owner', { owner: project.owner })}</span>
                      )}
                      {project.defaultBranch && (
                        <span>{t('selection.branch', { branch: project.defaultBranch })}</span>
                      )}
                    </div>
                    {showNotAccessible && project.newProject === 0 && (
                      <p className={styles.projectCardNotice}>
                        {t('selection.notReachableNotice')}
                      </p>
                    )}
                  </div>
                  <span className={styles.projectCardArrow} aria-hidden="true">
                    <Icon name="arrow-right" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {onSettings && (
          <div className={styles.projectSelectionFooter}>
            <Button variant="secondary" onClick={onSettings}>
              <Icon name="settings" /> {t('selection.manageGear')}
            </Button>
          </div>
        )}
      </main>
    </AppShell>
  );
}
