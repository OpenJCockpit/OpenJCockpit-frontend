import { useState, type FormEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { ActionRow, Button, Icon, SelectField, TextAreaField } from '@openjcockpit/ui';
import { startControlTowerInterview, type ControlTowerInterview } from '@openjcockpit/api';
import { useRepositoryMutation, useTemplates } from '../hooks';
import type { RunAction } from '../useAction';
import { useWriteAccess } from '../useWriteAccess';
import styles from './InterviewsPage.module.scss';

interface Props {
  repositoryId: string;
  run: RunAction;
  onStarted: (interview: ControlTowerInterview) => void;
}

/** Picks a questionnaire (and a feature request for feature interviews) and starts the interview. */
export function StartInterviewForm({ repositoryId, run, onStarted }: Props) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const templates = useTemplates().data ?? [];
  const [templateId, setTemplateId] = useState('');
  const [featureRequest, setFeatureRequest] = useState('');
  const start = useRepositoryMutation(repositoryId, startControlTowerInterview);
  const template = templates.find((candidate) => candidate.id === templateId);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const interview = await start.mutateAsync({
        projectId: repositoryId,
        templateId,
        featureRequest: template?.kind === 'FEATURE' ? featureRequest : undefined,
      });
      onStarted(interview);
    });
  }

  return (
    <form onSubmit={onSubmit} className={styles.session}>
      <SelectField
        label={t('interviews.template')}
        value={templateId}
        onChange={setTemplateId}
        options={[
          { value: '', label: t('interviews.selectTemplate') },
          ...templates.map((c) => ({ value: c.id, label: `${c.name} (${t(`kind.${c.kind}`)})` })),
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
      <ActionRow>
        <Button
          variant="primary"
          type="submit"
          disabled={!templateId || start.isPending || !canWrite}
        >
          <Icon name={start.isPending ? 'spinner' : 'plus'} />{' '}
          {start.isPending ? t('interviews.starting') : t('interviews.start')}
        </Button>
      </ActionRow>
    </form>
  );
}
