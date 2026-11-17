import { useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import { Panel, PanelBody, PanelHeader, PanelTitle, TwoColumn } from '@openjcockpit/ui';
import type { ControlTowerInterview } from '@openjcockpit/api';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { ActionFeedback } from '../ActionFeedback';
import { interviewPath } from '../routePaths';
import { useAction } from '../useAction';
import { InterviewHistory } from './InterviewHistory';
import { StartInterviewForm } from './StartInterviewForm';

/** Adaptive discovery interviews, typed or dictated: start one or open an earlier one on its own screen. */
export function InterviewsPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const navigate = useNavigate();
  const { run, feedback, clear } = useAction();
  const open = (interview: ControlTowerInterview) => void navigate(interviewPath(interview.id));

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.session')}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <ActionFeedback feedback={feedback} onDismiss={clear} />
          <StartInterviewForm repositoryId={repository.id} run={run} onStarted={open} />
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.previous')}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <InterviewHistory repositoryId={repository.id} onSelect={open} />
        </PanelBody>
      </Panel>
    </TwoColumn>
  );
}
