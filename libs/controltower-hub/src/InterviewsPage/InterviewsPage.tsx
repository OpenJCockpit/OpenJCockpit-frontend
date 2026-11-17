import { useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { Panel, PanelHeader, PanelTitle } from '@openjcockpit/ui';
import type { ControlTowerInterview } from '@openjcockpit/api';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { ActionFeedback } from '../ActionFeedback';
import { useAction } from '../useAction';
import common from '../shared.module.scss';
import { InterviewHistory } from './InterviewHistory';
import { InterviewSession } from './InterviewSession';
import { StartInterviewForm } from './StartInterviewForm';

/** Adaptive discovery interviews, typed or dictated; a completed one generates spec drafts. */
export function InterviewsPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const [active, setActive] = useState<ControlTowerInterview | null>(null);
  const { run, feedback } = useAction();

  return (
    <div className={common.twoCol}>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.session')}</PanelTitle>
        </PanelHeader>
        <div className={common.body}>
          <ActionFeedback feedback={feedback} />
          {active ? (
            <InterviewSession
              key={active.id}
              repositoryId={repository.id}
              interview={active}
              run={run}
              onChange={setActive}
              onClose={() => setActive(null)}
            />
          ) : (
            <StartInterviewForm repositoryId={repository.id} run={run} onStarted={setActive} />
          )}
        </div>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.previous')}</PanelTitle>
        </PanelHeader>
        <div className={common.body}>
          <InterviewHistory repositoryId={repository.id} onSelect={setActive} />
        </div>
      </Panel>
    </div>
  );
}
