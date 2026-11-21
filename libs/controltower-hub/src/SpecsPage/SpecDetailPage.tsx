import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Button,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  StatusChip,
  buttonClass,
  useConfirmDialog,
} from '@openjcockpit/ui';
import {
  approveControlTowerSpec,
  completeControlTowerSpec,
  type ControlTowerSpec,
} from '@openjcockpit/api';
import { ActionFeedback } from '../ActionFeedback';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useInterviews, useRepositoryMutation, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import {
  CONTROLTOWER_QUEUE_PATH,
  CONTROLTOWER_SPECS_PATH,
  interviewPath,
  specPath,
} from '../routePaths';
import { deriveBlockers, draftReviewOrder, type SpecBlockers } from '../specGraph';
import { useAction } from '../useAction';
import { useWriteAccess } from '../useWriteAccess';
import { CopyButton } from './CopyButton';
import { STATUS_KIND } from './statusKind';
import styles from './SpecsPage.module.scss';

/** One specification on its own screen: metadata, dependencies, body and the actions its status allows. */
export function SpecDetailPage() {
  const { t } = useTranslation('controltower');
  const { specId = '' } = useParams();
  const repository = useRepository();
  const specs = useSpecs(repository.id);
  const { run, feedback, clear } = useAction();
  const { confirm, dialog } = useConfirmDialog();
  const canWrite = useWriteAccess();
  const approve = useRepositoryMutation(repository.id, approveControlTowerSpec);
  const complete = useRepositoryMutation(repository.id, completeControlTowerSpec);
  const blockers = useMemo(() => deriveBlockers(specs.data ?? []), [specs.data]);
  const titles = useMemo(
    () => new Map((specs.data ?? []).map((s) => [s.id, s.title])),
    [specs.data],
  );
  const spec = specs.data?.find((s) => s.id === specId);
  const interviewTitle = useInterviews(repository.id).data?.find(
    (i) => i.id === spec?.interviewId,
  )?.title;

  const askApprove = (target: ControlTowerSpec) =>
    confirm({
      title: t('specs.approveTitle'),
      message: t('specs.approveMessage', { title: target.title }),
      confirmLabel: t('specs.approve'),
      cancelLabel: t('cancel'),
      busyLabel: t('specs.approving'),
      tone: 'primary',
      onConfirm: () =>
        run(
          () => approve.mutateAsync(target.id),
          (approved) => {
            const nextDraft = draftReviewOrder(
              (specs.data as ControlTowerSpec[]).filter((s) => s.id !== target.id),
            )[0];
            return {
              ok: true,
              message: t('specs.approved', { branch: approved.branch ?? '' }),
              next: nextDraft ? (
                <Link to={specPath(nextDraft.id)}>{t('specs.nextDraft')}</Link>
              ) : (
                <Link to={CONTROLTOWER_QUEUE_PATH}>{t('specs.toQueue')}</Link>
              ),
            };
          },
        ),
    });

  const specLinks = (ids: readonly string[]) => (
    <span className={styles.specLinks}>
      {ids.map((id) =>
        titles.has(id) ? (
          <Link
            key={id}
            className={buttonClass({ variant: 'secondary' })}
            to={specPath(id)}
            title={id}
          >
            {titles.get(id)}
          </Link>
        ) : (
          <code key={id}>{id}</code>
        ),
      )}
    </span>
  );

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{spec?.title ?? t('specs.detailTitle')}</PanelTitle>
        <Link to={CONTROLTOWER_SPECS_PATH}>{t('specs.backToList')}</Link>
      </PanelHeader>
      <PanelBody>
        <ActionFeedback feedback={feedback} onDismiss={clear} />
        <ControlTowerQuery query={specs} loadFailed={t('specs.loadFailed')}>
          {() =>
            spec ? (
              <div className={styles.specDetails}>
                <span className={styles.statusTag}>
                  <StatusChip
                    label={t(`specs.status.${spec.status}`)}
                    kind={STATUS_KIND[spec.status]}
                  />
                </span>
                <small>
                  {spec.id} · <code>{`specs/${spec.specPath}`}</code>
                  {spec.branch && ` · ${t('specs.branch', { branch: spec.branch })}`}
                </small>
                {spec.interviewId && (
                  <div className={styles.specRelation}>
                    <span>{t('specs.interview')}</span>
                    <Link
                      className={buttonClass({ variant: 'secondary' })}
                      to={interviewPath(spec.interviewId)}
                    >
                      {interviewTitle ?? t('specs.viewInterview')}
                    </Link>
                  </div>
                )}
                <div className={styles.specRelation}>
                  <span>{t('specs.dependencies')}</span>
                  {spec.dependsOn.length ? specLinks(spec.dependsOn) : t('specs.noDependencies')}
                </div>
                {(blockers.get(spec.id) as SpecBlockers).blocks.length > 0 && (
                  <div className={styles.specRelation}>
                    <span>{t('specs.blocks')}</span>
                    {specLinks((blockers.get(spec.id) as SpecBlockers).blocks)}
                  </div>
                )}
                <ActionRow>
                  {spec.branch && <CopyButton text={spec.branch} label={t('specs.copyBranch')} />}
                  <CopyButton text={spec.body} label={t('specs.copyBody')} />
                </ActionRow>
                <pre>{spec.body}</pre>
                {canWrite && (
                  <ActionRow>
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
                  </ActionRow>
                )}
              </div>
            ) : (
              <EmptyState title={t('specs.notFound')} />
            )
          }
        </ControlTowerQuery>
      </PanelBody>
      {dialog}
    </Panel>
  );
}
