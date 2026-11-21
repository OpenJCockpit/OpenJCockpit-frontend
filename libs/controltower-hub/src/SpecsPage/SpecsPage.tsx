import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Button,
  CheckboxField,
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
import { approveControlTowerSpec, type ControlTowerSpec } from '@openjcockpit/api';
import { ActionFeedback } from '../ActionFeedback';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { errorMessage } from '../errorMessage';
import { useRepositoryMutation, useSpecs } from '../hooks';
import { CONTROLTOWER_INTERVIEWS_PATH } from '../routePaths';
import { draftReviewOrder } from '../specGraph';
import { useAction } from '../useAction';
import { useWriteAccess } from '../useWriteAccess';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { useHandoffNotice } from './handoff';
import { SpecFilterBar } from './SpecFilterBar';
import { byStatusThenNewest, filterFromParams, filterSpecs } from './specFilter';
import { SpecRow } from './SpecRow';

/** The specification registry: browse specifications and open one for review and approval. */
export function SpecsPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const specs = useSpecs(repository.id);
  const data = specs.data;
  const handoff = useHandoffNotice();
  const newIds = new Set(handoff?.specIds);
  const [params, setParams] = useSearchParams();
  const filter = filterFromParams(params);
  const canWrite = useWriteAccess();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const { run, feedback, clear } = useAction();
  const { confirm, dialog } = useConfirmDialog();
  const approve = useRepositoryMutation(repository.id, approveControlTowerSpec);

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Approves the drafts one by one in dependency order; the first failure stops the run. */
  const askApproveMany = (drafts: ControlTowerSpec[]) =>
    confirm({
      title: t('specs.bulkApproveTitle', { count: drafts.length }),
      message: t('specs.bulkApproveMessage'),
      details: (
        <ul>
          {drafts.map((d) => (
            <li key={d.id}>{d.title}</li>
          ))}
        </ul>
      ),
      confirmLabel: t('specs.approve'),
      cancelLabel: t('cancel'),
      busyLabel: t('specs.approving'),
      tone: 'primary',
      onConfirm: () =>
        run(
          async () => {
            const done: string[] = [];
            try {
              for (const draft of drafts) {
                await approve.mutateAsync(draft.id);
                done.push(draft.id);
              }
              return { count: done.length, failed: null };
            } catch (e) {
              const title = (drafts[done.length] as ControlTowerSpec).title;
              return {
                count: done.length,
                failed: { title, error: errorMessage(e) },
              };
            } finally {
              setSelected((prev) => new Set([...prev].filter((id) => !done.includes(id))));
            }
          },
          ({ count, failed }) =>
            failed
              ? { ok: false, message: t('specs.bulkApproveFailed', { ...failed, count }) }
              : t('specs.bulkApproved', { count }),
        ),
    });

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('specs.title')}</PanelTitle>
        {data && <StatusChip label={t('specs.count', { count: data.length })} kind="neutral" />}
      </PanelHeader>
      <PanelBody>
        {handoff !== null && (
          <StatusMessage role="status" variant="info">
            {t('specs.draftsCreated', { count: handoff.draftsCreated })}
          </StatusMessage>
        )}
        {filter.interviewId !== null && (
          <StatusMessage role="status" variant="info">
            {t('specs.fromInterview')}{' '}
            <Link
              to={{
                search: (() => {
                  const next = new URLSearchParams(params);
                  next.delete('interview');
                  return next.toString();
                })(),
              }}
            >
              {t('specs.showAll')}
            </Link>
          </StatusMessage>
        )}
        <ActionFeedback feedback={feedback} onDismiss={clear} />
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
            const sorted = byStatusThenNewest(filterSpecs(rows, filter));
            const shown = [
              ...sorted.filter((spec) => newIds.has(spec.id)),
              ...sorted.filter((spec) => !newIds.has(spec.id)),
            ];
            const shownDrafts = shown.filter((spec) => spec.status === 'DRAFT');
            const chosen = draftReviewOrder(shownDrafts.filter((spec) => selected.has(spec.id)));
            return (
              <>
                <SpecFilterBar
                  specs={rows}
                  filter={filter}
                  onChange={(next) =>
                    setParams(
                      (prev) => {
                        const params = new URLSearchParams(prev);
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
                {canWrite && shownDrafts.length > 0 && (
                  <ActionRow>
                    <CheckboxField
                      label={t('specs.selectAllDrafts')}
                      checked={chosen.length === shownDrafts.length}
                      onChange={(on) =>
                        setSelected(on ? new Set(shownDrafts.map((d) => d.id)) : new Set())
                      }
                    />
                    <Button
                      variant="primary"
                      disabled={chosen.length === 0 || approve.isPending}
                      onClick={() => askApproveMany(chosen)}
                    >
                      {t('specs.approveSelected', { count: chosen.length })}
                    </Button>
                  </ActionRow>
                )}
                {shown.length === 0 && <EmptyState title={t('specs.noMatches')} />}
                {shown.map((spec) => (
                  <SpecRow
                    key={spec.id}
                    spec={spec}
                    isNew={newIds.has(spec.id)}
                    selected={selected.has(spec.id)}
                    onSelect={
                      canWrite && spec.status === 'DRAFT' ? (on) => toggle(spec.id, on) : undefined
                    }
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
