import { useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  PanelHeader,
  PanelTitle,
  StatusChip,
  StatusMessage,
  useConfirmDialog,
} from '@openjcockpit/ui';
import type { StatusKind } from '@openjcockpit/ui';
import {
  approveControlTowerSpec,
  completeControlTowerSpec,
  type ControlTowerSpec,
  type ControlTowerSpecStatus,
} from '@openjcockpit/api';
import { useRepositoryMutation, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { errorMessage } from '../errorMessage';
import { useWriteAccess } from '../useWriteAccess';
import common from '../shared.module.scss';
import styles from './SpecsPage.module.scss';

const STATUS_KIND: Record<ControlTowerSpecStatus, StatusKind> = {
  DRAFT: 'open',
  APPROVED: 'review',
  DISPATCHED: 'active',
  DONE: 'done',
};

/** The specification registry: review drafts, approve them (pushes a Git branch) and confirm finished work. */
export function SpecsPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const canWrite = useWriteAccess();
  const { data, isError, refetch } = useSpecs(repository.id);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const approve = useRepositoryMutation(repository.id, approveControlTowerSpec);
  const complete = useRepositoryMutation(repository.id, completeControlTowerSpec);

  async function run<T>(action: () => Promise<T>, success: (result: T) => string) {
    setMessage(null);
    setError(null);
    try {
      setMessage(success(await action()));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const askApprove = (spec: ControlTowerSpec) =>
    confirm({
      title: t('specs.approveTitle'),
      message: t('specs.approveMessage', { title: spec.title }),
      confirmLabel: t('specs.approve'),
      cancelLabel: t('cancel'),
      busyLabel: t('specs.approving'),
      tone: 'primary',
      onConfirm: () =>
        run(
          () => approve.mutateAsync(spec.id),
          (approved) => t('specs.approved', { branch: approved.branch ?? '' }),
        ),
    });

  let content;
  if (data) {
    content = data.length ? (
      data.map((spec) => (
        <details className={styles.spec} key={spec.id}>
          <summary>
            <div>
              <b>{spec.title}</b>
              <small>
                {[
                  `${spec.id} · specs/${spec.specPath}`,
                  spec.branch && t('specs.branch', { branch: spec.branch }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            </div>
            <StatusChip label={t(`specs.status.${spec.status}`)} kind={STATUS_KIND[spec.status]} />
          </summary>
          <div className={styles.specDetails}>
            <p>
              {t('specs.dependencies', {
                list: spec.dependsOn.join(', ') || t('specs.noDependencies'),
              })}
            </p>
            <pre>{spec.body}</pre>
            {canWrite && (
              <div className={common.actions}>
                {spec.status === 'DRAFT' && (
                  <Button variant="primary" onClick={() => askApprove(spec)}>
                    {t('specs.approveAndPush')}
                  </Button>
                )}
                {spec.status === 'DISPATCHED' && (
                  <Button
                    variant="secondary"
                    disabled={complete.isPending}
                    onClick={() =>
                      void run(
                        () => complete.mutateAsync(spec.id),
                        () => t('specs.completed'),
                      )
                    }
                  >
                    {t('specs.confirmDone')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </details>
      ))
    ) : (
      <EmptyState title={t('specs.empty')} />
    );
  } else if (isError) {
    content = (
      <ErrorState onRetry={() => void refetch()} retryLabel={t('retry')}>
        {t('specs.loadFailed')}
      </ErrorState>
    );
  } else {
    content = <LoadingState>{t('loading')}</LoadingState>;
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('specs.title')}</PanelTitle>
        {data && <StatusChip label={t('specs.count', { count: data.length })} kind="neutral" />}
      </PanelHeader>
      <div className={common.body}>
        {message && <StatusMessage role="status">{message}</StatusMessage>}
        {error && (
          <StatusMessage variant="error" role="alert">
            {error}
          </StatusMessage>
        )}
        {content}
      </div>
      {dialog}
    </Panel>
  );
}
