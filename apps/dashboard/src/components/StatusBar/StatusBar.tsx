import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getSpecQueue, queryKeys } from '@openjcockpit/api';
import type { GitStatus, Project } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { StatusChip } from '@openjcockpit/ui';
import { ROUTES } from '../../routes';
import {
  gitStatusKind,
  queueStateKind,
  summarizeQueue,
  type QueueCountKey,
  type QueueSummary,
} from './statusBarModel';
import styles from './StatusBar.module.scss';

const QUEUE_REFRESH_MS = 30_000;

export interface StatusBarProps {
  gitStatus: GitStatus;
  /** Null while loading or when the queue could not be loaded. */
  queue: QueueSummary | null;
  queueFailed: boolean;
}

export function StatusBar({ gitStatus, queue, queueFailed }: StatusBarProps) {
  const { t } = useTranslation('dashboard');
  const running = queue?.counts.some((c) => c.key === 'running') ?? false;
  const failed = queue?.counts.find((c) => c.key === 'failed')?.count ?? 0;
  const progress = queue?.counts.filter((c) => c.key !== 'failed') ?? [];
  return (
    <footer className={styles.statusBar}>
      {queue && (
        <Link to={ROUTES.specQueue} className={styles.item} aria-label={t('statusBar.queueLink')}>
          <StatusChip
            label={t('statusBar.queue', { state: t(`statusBar.queueState.${queue.state}`) })}
            kind={queueStateKind(queue.state, running)}
          />
          {progress.length === 0 ? (
            <span>{t('statusBar.queueEmpty')}</span>
          ) : (
            <span>
              {progress
                .map((c) =>
                  t(`statusBar.count.${c.key satisfies QueueCountKey}`, { count: c.count }),
                )
                .join(' · ')}
            </span>
          )}
        </Link>
      )}
      {queue && failed > 0 && (
        <Link to={ROUTES.specQueue} className={styles.item}>
          <StatusChip label={t('statusBar.count.failed', { count: failed })} kind="error" />
        </Link>
      )}
      {queueFailed && <StatusChip label={t('statusBar.queueUnavailable')} kind="neutral" />}
      <Link to={ROUTES.projectSettings} className={styles.item} aria-label={t('statusBar.gitLink')}>
        <StatusChip label={t(`statusBar.git.${gitStatus}`)} kind={gitStatusKind(gitStatus)} />
      </Link>
      <span className={styles.copyright}>{t('statusBar.copyright')}</span>
    </footer>
  );
}

/** The footer for every screen: it follows the selected project and is absent without one. */
export function HubStatusBar({ project }: { project: Project | null }) {
  const projectId = project?.id ?? null;
  // Same cache entry as the queue page and the spec-queue badge, so this adds no extra request there.
  const queueQuery = useQuery({
    queryKey: queryKeys.specQueue(projectId),
    queryFn: () => getSpecQueue(projectId as string),
    enabled: projectId !== null,
    refetchInterval: QUEUE_REFRESH_MS,
  });
  if (!project) return null;
  return (
    <StatusBar
      gitStatus={project.gitStatus}
      queue={queueQuery.data ? summarizeQueue(queueQuery.data) : null}
      queueFailed={queueQuery.isError && !queueQuery.data}
    />
  );
}
