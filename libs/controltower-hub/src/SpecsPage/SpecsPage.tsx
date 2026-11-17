import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  EmptyState,
  Panel,
  PanelHeader,
  PanelTitle,
  StatusChip,
  useConfirmDialog,
} from '@openjcockpit/ui';
import type { StatusKind } from '@openjcockpit/ui';
import {
  approveControlTowerSpec,
  completeControlTowerSpec,
  type ControlTowerSpec,
  type ControlTowerSpecStatus,
} from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useRepositoryMutation, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { ActionFeedback } from '../ActionFeedback';
import { useAction } from '../useAction';
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
  const specs = useSpecs(repository.id);
  const data = specs.data;
  const { run, feedback } = useAction();
  const { confirm, dialog } = useConfirmDialog();
  const approve = useRepositoryMutation(repository.id, approveControlTowerSpec);
  const complete = useRepositoryMutation(repository.id, completeControlTowerSpec);

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

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('specs.title')}</PanelTitle>
        {data && <StatusChip label={t('specs.count', { count: data.length })} kind="neutral" />}
      </PanelHeader>
      <div className={common.body}>
        <ActionFeedback feedback={feedback} />
        <ControlTowerQuery
          query={specs}
          loadFailed={t('specs.loadFailed')}
          isEmpty={(rows) => rows.length === 0}
          empty={<EmptyState title={t('specs.empty')} />}
        >
          {(rows) =>
            rows.map((spec) => (
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
                  <StatusChip
                    label={t(`specs.status.${spec.status}`)}
                    kind={STATUS_KIND[spec.status]}
                  />
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
          }
        </ControlTowerQuery>
      </div>
      {dialog}
    </Panel>
  );
}
