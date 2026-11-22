import type { Project } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { GitStatusBadge } from '../GitStatusBadge/GitStatusBadge';
import { SetupBadge } from '../ProjectOverview/SetupBadge';
import { canSelectProject } from '../ProjectSelection/ProjectSelection';
import {
  Actions,
  DataTable,
  DataTableRow,
  fieldHintClass,
  Button,
  StatusChip,
  cx,
} from '@openjcockpit/ui';
import styles from './ProjectList.module.scss';

interface Props {
  projects: readonly Project[];
  selectedId: string | null;
  onSelect: (project: Project) => void;
  /** Present for users who may open the project's settings. */
  onSettings?: (project: Project) => void;
  /** Present for users who may switch projects on and off. */
  onToggleActive?: (project: Project) => void;
}

export function ProjectList({ projects, selectedId, onSelect, onSettings, onToggleActive }: Props) {
  const { t } = useTranslation('project');
  return (
    <DataTable>
      <thead>
        <tr>
          <th>{t('list.name')}</th>
          <th>{t('list.environment')}</th>
          <th>{t('list.gitStatus')}</th>
          <th>{t('list.status')}</th>
          <th>{t('list.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <DataTableRow key={project.id} inactive={project.active === 0}>
            <td>
              <strong>{project.name}</strong>
              {project.id === selectedId && (
                <>
                  {' '}
                  <StatusChip label={t('list.current')} kind="active" />
                </>
              )}
              {project.description && <span className={fieldHintClass}>{project.description}</span>}
              {project.gitUrl && (
                <span className={cx(fieldHintClass, styles.gitUrl)}>{project.gitUrl}</span>
              )}
            </td>
            <td>{project.environment}</td>
            <td>
              <GitStatusBadge status={project.gitStatus} />
              {project.gitStatusMessage && (
                <span className={cx(fieldHintClass, styles.gitMessage)}>
                  {project.gitStatusMessage}
                </span>
              )}
            </td>
            <td>
              <StatusChip
                label={project.active === 1 ? t('list.active') : t('list.inactive')}
                kind={project.active === 1 ? 'ok' : 'neutral'}
              />{' '}
              <SetupBadge project={project} />
            </td>
            <Actions as="td">
              <Button
                variant="secondary"
                onClick={() => onSelect(project)}
                disabled={!canSelectProject(project)}
              >
                {t('list.select')}
              </Button>
              {onSettings && (
                <Button variant="secondary" onClick={() => onSettings(project)}>
                  {t('list.settings')}
                </Button>
              )}
              {onToggleActive && (
                <Button variant="secondary" onClick={() => onToggleActive(project)}>
                  {project.active === 1 ? t('list.deactivate') : t('list.activate')}
                </Button>
              )}
            </Actions>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}
