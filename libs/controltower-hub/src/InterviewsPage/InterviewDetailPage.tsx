import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@openjcockpit/ui';
import { queryKeys, type ControlTowerInterview } from '@openjcockpit/api';
import { ActionFeedback } from '../ActionFeedback';
import { ControlTowerQuery } from '../ControlTowerQuery';
import { useInterview } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { CONTROLTOWER_INTERVIEWS_PATH } from '../routePaths';
import { useAction } from '../useAction';
import { InterviewSession } from './InterviewSession';

/** One interview on its own screen: its questions and answers, the answer form while active, and spec generation once complete. */
export function InterviewDetailPage() {
  const { t } = useTranslation('controltower');
  const { interviewId = '' } = useParams();
  const repository = useRepository();
  const navigate = useNavigate();
  const client = useQueryClient();
  const interview = useInterview(interviewId);
  const { run, feedback, clear } = useAction();

  const onChange = (next: ControlTowerInterview) =>
    client.setQueryData(queryKeys.controlTowerInterview(next.id), next);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{interview.data?.title ?? t('interviews.session')}</PanelTitle>
        <Link to={CONTROLTOWER_INTERVIEWS_PATH}>{t('interviews.backToList')}</Link>
      </PanelHeader>
      <PanelBody>
        <ActionFeedback feedback={feedback} onDismiss={clear} />
        <ControlTowerQuery query={interview} loadFailed={t('interviews.loadFailed')}>
          {(data) => (
            <InterviewSession
              key={data.id}
              repositoryId={repository.id}
              interview={data}
              run={run}
              onChange={onChange}
              onClose={() => void navigate(CONTROLTOWER_INTERVIEWS_PATH)}
            />
          )}
        </ControlTowerQuery>
      </PanelBody>
    </Panel>
  );
}
