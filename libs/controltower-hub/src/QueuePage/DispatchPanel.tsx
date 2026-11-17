import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  buttonClass,
  CheckboxField,
  Panel,
  PanelHeader,
  PanelTitle,
  StatusMessage,
} from '@openjcockpit/ui';
import { dispatchControlTowerSpecs, type ControlTowerDispatchOutcome } from '@openjcockpit/api';
import { useRepositoryMutation } from '../hooks';
import { SPEC_QUEUE_PATH } from '../routePaths';
import { useWriteAccess } from '../useWriteAccess';
import common from '../shared.module.scss';

interface Props {
  repositoryId: string;
  /** Number of specs ready to dispatch. */
  readyCount: number;
}

/** The opt-in dispatch of the ready specs to OpenJCockpit, and its outcome. */
export function DispatchPanel({ repositoryId, readyCount }: Props) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const [published, setPublished] = useState(false);
  const [outcomes, setOutcomes] = useState<ControlTowerDispatchOutcome[] | null>(null);
  const dispatch = useRepositoryMutation(repositoryId, () =>
    dispatchControlTowerSpecs(repositoryId, published),
  );

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('queue.dispatchTitle')}</PanelTitle>
      </PanelHeader>
      <div className={common.body}>
        <StatusMessage>{t('queue.hint')}</StatusMessage>
        {canWrite && (
          <>
            <CheckboxField
              label={t('queue.published')}
              checked={published}
              onChange={setPublished}
            />
            <div className={common.actions}>
              <Button
                variant="primary"
                disabled={dispatch.isPending || !published || !readyCount}
                onClick={() => {
                  setOutcomes(null);
                  dispatch.mutate(undefined, { onSuccess: setOutcomes });
                }}
              >
                {t('queue.dispatch')}
              </Button>
            </div>
          </>
        )}
        {dispatch.isError && (
          <StatusMessage variant="error" role="alert">
            {dispatch.error.message}
          </StatusMessage>
        )}
        {outcomes && (
          <div role="status">
            <p>
              {outcomes
                .map((o) => t(`queue.result.${o.result}`, { defaultValue: o.result }))
                .join(', ')}
            </p>
            <Link className={buttonClass({ variant: 'secondary' })} to={SPEC_QUEUE_PATH}>
              {t('queue.openSpecQueue')}
            </Link>
          </div>
        )}
        <StatusMessage>{t('queue.unknownHint')}</StatusMessage>
      </div>
    </Panel>
  );
}
