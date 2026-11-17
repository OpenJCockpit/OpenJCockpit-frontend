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
import { SPEC_QUEUE_PATH } from '../routePaths';
import { useWriteAccess } from '../useWriteAccess';

interface Props {
  repositoryId: string;
  /** The specs ready to dispatch, in queue order. */
  ready: ControlTowerQueueCandidate[];
  /** All specs, to name the specs in an outcome. */
  specs?: ControlTowerSpec[];
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
  const [outcomes, setOutcomes] = useState<ControlTowerDispatchOutcome[] | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const dispatch = useRepositoryMutation(repositoryId, () =>
    dispatchControlTowerSpecs(repositoryId, published),
  );
  const titles = new Map<string, string>([
    ...(specs ?? []).map((s) => [s.id, s.title] as const),
    ...ready.map((c) => [c.specId, c.title] as const),
  ]);
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
        await dispatch.mutateAsync(undefined).then(setOutcomes, () => undefined);
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
            />
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
                  {titles.get(o.specId) ?? o.specId}{' '}
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
