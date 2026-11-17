import { useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { Panel, PanelBody, PanelHeader, PanelTitle, TwoColumn } from '@openjcockpit/ui';
import type { ControlTowerInterview } from '@openjcockpit/api';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { ActionFeedback } from '../ActionFeedback';
import { useAction } from '../useAction';
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
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.session')}</PanelTitle>
        </PanelHeader>
        <PanelBody>
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
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.previous')}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <InterviewHistory repositoryId={repository.id} onSelect={setActive} />
        </PanelBody>
      </Panel>
    </TwoColumn>
  );
}
