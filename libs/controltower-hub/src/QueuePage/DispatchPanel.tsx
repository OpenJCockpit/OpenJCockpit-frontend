import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Button,
  CheckboxField,
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
  dispatchControlTowerSpecs,
  type ControlTowerDispatchOutcome,
  type ControlTowerQueueCandidate,
  type ControlTowerSpec,
} from '@openjcockpit/api';
import { useRepositoryMutation } from '../hooks';
import { SPEC_QUEUE_PATH, specPath } from '../routePaths';
import { useWriteAccess } from '../useWriteAccess';

interface Props {
  repositoryId: string;
  /** The specs ready to dispatch, in queue order. */
  ready: ControlTowerQueueCandidate[];
  /** All specs, to name the specs in an outcome. */
  specs?: ControlTowerSpec[];
}

const outcomesKey = (repositoryId: string) => `controltower.dispatchOutcomes.${repositoryId}`;

/** The last outcomes survive navigation within the session; storage failures just mean none. */
function loadOutcomes(repositoryId: string): ControlTowerDispatchOutcome[] | null {
  try {
    const raw = sessionStorage.getItem(outcomesKey(repositoryId));
    return raw ? (JSON.parse(raw) as ControlTowerDispatchOutcome[]) : null;
  } catch {
    return null;
  }
}

function saveOutcomes(repositoryId: string, outcomes: ControlTowerDispatchOutcome[]) {
  try {
    sessionStorage.setItem(outcomesKey(repositoryId), JSON.stringify(outcomes));
  } catch {
    // Persisting is a convenience only.
  }
}

function outcomeKind(result: string) {
  if (result === 'DISPATCHED') return 'ok';
  if (result === 'UNKNOWN') return 'changes';
  return 'neutral';
}

/** The opt-in dispatch of the ready specs to OpenJCockpit, and its outcome. */
export function DispatchPanel({ repositoryId, ready, specs }: Props) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const [published, setPublished] = useState(false);
  const [outcomes, setOutcomes] = useState(() => loadOutcomes(repositoryId));
  const { confirm, dialog } = useConfirmDialog();
  const dispatch = useRepositoryMutation(repositoryId, () =>
    dispatchControlTowerSpecs(repositoryId, published),
  );
  const titles = new Map<string, string>([
    ...(specs ?? []).map((s) => [s.id, s.title] as const),
    ...ready.map((c) => [c.specId, c.title] as const),
  ]);
  const branches = [
    ...new Set(
      ready.flatMap((c) => {
        const branch = specs?.find((s) => s.id === c.specId)?.branch;
        return branch ? [branch] : [];
      }),
    ),
  ];
  const disabledReason = !ready.length
    ? t('queue.disabledNothingReady')
    : !published
      ? t('queue.disabledNotPublished')
      : null;

  const askDispatch = () =>
    confirm({
      title: t('queue.confirmTitle'),
      message: t('queue.confirmMessage', { count: ready.length }),
      details: (
        <ul>
          {ready.map((c) => (
            <li key={c.specId}>{c.title}</li>
          ))}
        </ul>
      ),
      confirmLabel: t('queue.dispatch'),
      cancelLabel: t('cancel'),
      busyLabel: t('queue.dispatching'),
      tone: 'primary',
      onConfirm: async () => {
        // The last outcome stays until the next dispatch completes, so a refetch never clears it.
        await dispatch.mutateAsync(undefined).then(
          (result) => {
            saveOutcomes(repositoryId, result);
            setOutcomes(result);
          },
          () => undefined,
        );
      },
    });

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('queue.dispatchTitle')}</PanelTitle>
      </PanelHeader>
      <PanelBody>
        <StatusMessage>{t('queue.hint')}</StatusMessage>
        {canWrite && (
          <>
            <CheckboxField
              label={t('queue.published')}
              checked={published}
              onChange={setPublished}
              hint={t('queue.publishedHint')}
            />
            {branches.length > 0 && (
              <StatusMessage>
                {t('queue.branchesToMerge')}{' '}
                {branches.map((b, i) => (
                  <span key={b}>
                    {i > 0 && ', '}
                    <code>{b}</code>
                  </span>
                ))}
              </StatusMessage>
            )}
            <ActionRow>
              <Button
                variant="primary"
                disabled={dispatch.isPending || disabledReason !== null}
                aria-describedby="queue-dispatch-reason"
                onClick={askDispatch}
              >
                {t('queue.dispatch')}
              </Button>
            </ActionRow>
            {disabledReason && (
              <StatusMessage id="queue-dispatch-reason">{disabledReason}</StatusMessage>
            )}
          </>
        )}
        {dispatch.isError && (
          <StatusMessage variant="error" role="alert">
            {dispatch.error.message}
          </StatusMessage>
        )}
        {outcomes && (
          <div role="status">
            <ul>
              {outcomes.map((o) => (
                <li key={o.specId}>
                  <Link to={specPath(o.specId)}>{titles.get(o.specId) ?? o.specId}</Link>{' '}
                  <StatusChip
                    label={t(`queue.result.${o.result}`, { defaultValue: o.result })}
                    kind={outcomeKind(o.result)}
                  />
                </li>
              ))}
            </ul>
            {outcomes.some((o) => o.result === 'UNKNOWN') && (
              <StatusMessage role="alert">{t('queue.unknownHint')}</StatusMessage>
            )}
            <Link className={buttonClass({ variant: 'secondary' })} to={SPEC_QUEUE_PATH}>
              {t('queue.openSpecQueue')}
            </Link>
          </div>
        )}
      </PanelBody>
      {dialog}
    </Panel>
  );
}
