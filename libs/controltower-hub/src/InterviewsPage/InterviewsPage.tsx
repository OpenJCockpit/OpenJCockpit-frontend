import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Panel,
  PanelHeader,
  PanelTitle,
  SelectField,
  StatusChip,
  StatusMessage,
  TextAreaField,
} from '@openjcockpit/ui';
import {
  answerControlTowerInterview,
  generateControlTowerSpecs,
  startControlTowerInterview,
  type ControlTowerInterview,
} from '@openjcockpit/api';
import { useInterviews, useRepositoryMutation, useSpecTemplates, useTemplates } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { CONTROLTOWER_SPECS_PATH } from '../routePaths';
import { errorMessage } from '../errorMessage';
import { useWriteAccess } from '../useWriteAccess';
import { SpeechButtons } from './SpeechButtons';
import common from '../shared.module.scss';
import styles from './InterviewsPage.module.scss';

/** Adaptive discovery interviews, typed or dictated; a completed one generates spec drafts. */
export function InterviewsPage() {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  const repository = useRepository();
  const canWrite = useWriteAccess();
  const interviews = useInterviews(repository.id);
  const templates = useTemplates().data ?? [];
  const specTemplates = useSpecTemplates().data ?? [];
  const [active, setActive] = useState<ControlTowerInterview | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [featureRequest, setFeatureRequest] = useState('');
  const [answer, setAnswer] = useState('');
  const [specTemplateId, setSpecTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const start = useRepositoryMutation(repository.id, startControlTowerInterview);
  const send = useRepositoryMutation(repository.id, (body: { id: string; answer: string }) =>
    answerControlTowerInterview(body.id, body.answer),
  );
  const generate = useRepositoryMutation(repository.id, (id: string) =>
    generateControlTowerSpecs(id, specTemplateId ? { specTemplateId } : undefined),
  );
  const busy = start.isPending || send.isPending || generate.isPending;
  const template = templates.find((candidate) => candidate.id === templateId);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function onStart(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const interview = await start.mutateAsync({
        projectId: repository.id,
        templateId,
        featureRequest: template?.kind === 'FEATURE' ? featureRequest : undefined,
      });
      setActive(interview);
      setAnswer('');
    });
  }

  function onAnswer(event: FormEvent, active: ControlTowerInterview) {
    event.preventDefault();
    void run(async () => {
      setActive(await send.mutateAsync({ id: active.id, answer }));
      setAnswer('');
    });
  }

  function onGenerate(active: ControlTowerInterview) {
    void run(async () => {
      await generate.mutateAsync(active.id);
      setActive(null);
      void navigate(CONTROLTOWER_SPECS_PATH);
    });
  }

  let session;
  if (active) {
    session = (
      <div className={styles.session}>
        <StatusChip
          label={`${t(`interviews.status.${active.status}`)} · ${active.kind}`}
          kind={active.status === 'ACTIVE' ? 'active' : 'done'}
        />
        <h3>{active.status === 'ACTIVE' ? active.currentQuestion : t('interviews.completed')}</h3>
        {active.status === 'ACTIVE' ? (
          <form onSubmit={(event) => onAnswer(event, active)} className={styles.session}>
            <TextAreaField
              label={t('interviews.answer')}
              rows={5}
              required
              value={answer}
              onChange={setAnswer}
              placeholder={t('interviews.answerPlaceholder')}
            />
            <SpeechButtons
              text={active.currentQuestion}
              onTranscript={(text) => setAnswer((old) => (old ? `${old} ${text}` : text))}
            />
            <div className={common.actions}>
              <Button variant="primary" type="submit" disabled={busy || !canWrite}>
                {t('interviews.submit')}
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.session}>
            <StatusMessage>{t('interviews.enough')}</StatusMessage>
            <SelectField
              label={t('interviews.specTemplate')}
              value={specTemplateId}
              onChange={setSpecTemplateId}
              options={[
                { value: '', label: t('interviews.defaultSpecTemplate') },
                ...specTemplates.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <div className={common.actions}>
              <Button
                variant="primary"
                disabled={busy || !canWrite || active.status !== 'COMPLETE'}
                onClick={() => onGenerate(active)}
              >
                <Icon name="sparkle" /> {t('interviews.generate')}
              </Button>
              <Button variant="secondary" onClick={() => setActive(null)}>
                {t('interviews.close')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    session = (
      <form onSubmit={onStart} className={styles.session}>
        <SelectField
          label={t('interviews.template')}
          value={templateId}
          onChange={setTemplateId}
          options={[
            { value: '', label: t('interviews.selectTemplate') },
            ...templates.map((c) => ({ value: c.id, label: `${c.name} (${c.kind})` })),
          ]}
        />
        {template?.kind === 'FEATURE' && (
          <TextAreaField
            label={t('interviews.featureRequest')}
            rows={4}
            required
            value={featureRequest}
            onChange={setFeatureRequest}
            placeholder={t('interviews.featurePlaceholder')}
          />
        )}
        <div className={common.actions}>
          <Button variant="primary" type="submit" disabled={!templateId || busy || !canWrite}>
            <Icon name="plus" /> {t('interviews.start')}
          </Button>
        </div>
      </form>
    );
  }

  let previous;
  if (interviews.data) {
    previous = interviews.data.length ? (
      interviews.data.map((interview) => (
        <div className={common.row} key={interview.id}>
          <button
            type="button"
            className={styles.rowButton}
            onClick={() => {
              setActive(interview);
              setAnswer('');
            }}
          >
            <span>
              <b>{interview.title}</b>
              <small>
                {t('interviews.summary', {
                  kind: interview.kind,
                  status: t(`interviews.status.${interview.status}`),
                  count: interview.answers.length,
                })}
              </small>
            </span>
            <Icon name="arrow-right" />
          </button>
        </div>
      ))
    ) : (
      <EmptyState title={t('interviews.none')} />
    );
  } else if (interviews.isError) {
    previous = (
      <ErrorState onRetry={() => void interviews.refetch()} retryLabel={t('retry')}>
        {t('interviews.loadFailed')}
      </ErrorState>
    );
  } else {
    previous = <LoadingState>{t('loading')}</LoadingState>;
  }

  return (
    <div className={common.twoCol}>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.session')}</PanelTitle>
        </PanelHeader>
        <div className={common.body}>
          {error && (
            <StatusMessage variant="error" role="alert">
              {error}
            </StatusMessage>
          )}
          {session}
        </div>
      </Panel>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('interviews.previous')}</PanelTitle>
        </PanelHeader>
        <div className={common.body}>
          {previous}
          <StatusMessage>{t('interviews.privacy')}</StatusMessage>
        </div>
      </Panel>
    </div>
  );
}
