import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
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
  StatusMessage,
  buttonClass,
  useConfirmDialog,
} from '@openjcockpit/ui';
import {
  approveControlTowerSpec,
  completeControlTowerSpec,
  type ControlTowerSpec,
} from '@openjcockpit/api';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useRepositoryMutation, useSpecs } from '../hooks';
import { CONTROLTOWER_INTERVIEWS_PATH, CONTROLTOWER_QUEUE_PATH } from '../routePaths';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { ActionFeedback } from '../ActionFeedback';
import { errorMessage } from '../errorMessage';
import { deriveBlockers } from '../specGraph';
import { useWriteAccess } from '../useWriteAccess';
import { useAction } from '../useAction';
import { useHandoffNotice } from './handoff';
import { SpecFilterBar } from './SpecFilterBar';
import { filterFromParams, filterSpecs } from './specFilter';
import { SpecRow } from './SpecRow';

/** The specification registry: review drafts, approve them (pushes a Git branch) and confirm finished work. */
export function SpecsPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const specs = useSpecs(repository.id);
  const data = specs.data;
  const { run, feedback, clear } = useAction();
  const { confirm, dialog } = useConfirmDialog();
  const handoff = useHandoffNotice();
  const canWrite = useWriteAccess();
  const [params, setParams] = useSearchParams();
  const filter = filterFromParams(params);
  const focus = params.get('focus');
  const blockers = useMemo(() => deriveBlockers(data ?? []), [data]);
  const titles = useMemo(() => new Map((data ?? []).map((s) => [s.id, s.title])), [data]);
  const drafts = (data ?? []).filter((s) => s.status === 'DRAFT');
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
          (approved) => ({
            ok: true,
            message: t('specs.approved', { branch: approved.branch ?? '' }),
            next: <Link to={CONTROLTOWER_QUEUE_PATH}>{t('specs.toQueue')}</Link>,
          }),
        ),
    });

  const askApproveAll = () =>
    confirm({
      title: t('specs.approveAllTitle'),
      message: t('specs.approveAllMessage', { count: drafts.length }),
      details: (
        <ul>
          {drafts.map((d) => (
            <li key={d.id}>{d.title}</li>
          ))}
        </ul>
      ),
      confirmLabel: t('specs.approveAll', { count: drafts.length }),
      cancelLabel: t('cancel'),
      busyLabel: t('specs.approving'),
      tone: 'primary',
      onConfirm: () =>
        run(
          async () => {
            // One at a time: each approval pushes a branch, so stop at the first failure.
            let done = 0;
            for (const spec of drafts) {
              try {
                await approve.mutateAsync(spec.id);
                done += 1;
              } catch (e) {
                return { done, failed: spec.title, error: errorMessage(e) };
              }
            }
            return { done, failed: null, error: '' };
          },
          ({ done, failed, error }) =>
            failed === null
              ? {
                  ok: true,
                  message: t('specs.approvedAll', { count: done }),
                  next: <Link to={CONTROLTOWER_QUEUE_PATH}>{t('specs.toQueue')}</Link>,
                }
              : {
                  ok: false,
                  message: t('specs.approveAllFailed', {
                    done,
                    total: drafts.length,
                    title: failed,
                    error,
                  }),
                },
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
      <PanelBody>
        {handoff !== null && (
          <StatusMessage role="status" variant="info">
            {t('specs.draftsCreated', { count: handoff })}
          </StatusMessage>
        )}
        <ActionFeedback feedback={feedback} onDismiss={clear} />
        {canWrite && drafts.length > 1 && (
          <ActionRow>
            <Button variant="secondary" disabled={approve.isPending} onClick={askApproveAll}>
              {t('specs.approveAll', { count: drafts.length })}
            </Button>
          </ActionRow>
        )}
        <ControlTowerQuery
          query={specs}
          loadFailed={t('specs.loadFailed')}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title={t('specs.empty')}
              action={
                <Link
                  className={buttonClass({ variant: 'secondary' })}
                  to={CONTROLTOWER_INTERVIEWS_PATH}
                >
                  {t('specs.emptyAction')}
                </Link>
              }
            />
          }
        >
          {(rows) => {
            const shown = filterSpecs(rows, filter);
            return (
              <>
                <SpecFilterBar
                  specs={rows}
                  filter={filter}
                  onChange={(next) =>
                    setParams(
                      (prev) => {
                        const params = new URLSearchParams(prev);
                        params.delete('focus');
                        if (next.status) params.set('status', next.status);
                        else params.delete('status');
                        if (next.query) params.set('q', next.query);
                        else params.delete('q');
                        return params;
                      },
                      { replace: true },
                    )
                  }
                />
                {shown.length === 0 && <EmptyState title={t('specs.noMatches')} />}
                {shown.map((spec) => (
                  <SpecRow
                    key={spec.id}
                    spec={spec}
                    titles={titles}
                    blocks={blockers.get(spec.id)?.blocks ?? []}
                    focused={focus === spec.id}
                    completing={complete.isPending}
                    onApprove={askApprove}
                    onComplete={onComplete}
                  />
                ))}
              </>
            );
          }}
        </ControlTowerQuery>
      </PanelBody>
      {dialog}
    </Panel>
  );
}
