import { useTranslation } from '@openjcockpit/i18n';
import {
  EmptyState,
  Panel,
  PanelHeader,
  PanelTitle,
  StatusChip,
  useConfirmDialog,
} from '@openjcockpit/ui';
import {
  approveControlTowerSpec,
  completeControlTowerSpec,
  type ControlTowerSpec,
} from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useRepositoryMutation, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { ActionFeedback } from '../ActionFeedback';
import { useAction } from '../useAction';
import common from '../shared.module.scss';
import { SpecRow } from './SpecRow';

/** The specification registry: review drafts, approve them (pushes a Git branch) and confirm finished work. */
export function SpecsPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
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

  const onComplete = (spec: ControlTowerSpec) =>
    void run(
      () => complete.mutateAsync(spec.id),
      () => t('specs.completed'),
    );

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
              <SpecRow
                key={spec.id}
                spec={spec}
                completing={complete.isPending}
                onApprove={askApprove}
                onComplete={onComplete}
              />
            ))
          }
        </ControlTowerQuery>
      </div>
      {dialog}
    </Panel>
  );
}
