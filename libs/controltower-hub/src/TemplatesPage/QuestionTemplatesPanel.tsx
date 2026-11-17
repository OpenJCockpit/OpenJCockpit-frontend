import { useState, type FormEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  Panel,
  PanelHeader,
  PanelTitle,
  SelectField,
  StatusChip,
  TextAreaField,
  TextField,
} from '@openjcockpit/ui';
import {
  createControlTowerTemplate,
  type ControlTowerQuestion,
  type ControlTowerTemplateKind,
} from '@openjcockpit/api';
import { errorMessage } from '../errorMessage';
import { useGlobalMutation, useTemplates } from '../hooks';
import type { RunAction } from '../useAction';
import { useWriteAccess } from '../useWriteAccess';
import { sampleQuestions } from '../sampleQuestions';
import common from '../shared.module.scss';
import { TemplateList } from './TemplateList';
import styles from './TemplatesPage.module.scss';

const pretty = (kind: ControlTowerTemplateKind) => JSON.stringify(sampleQuestions(kind), null, 2);

/** Saved interview questionnaires and the form that adds one. */
export function QuestionTemplatesPanel({ run }: { run: RunAction }) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const templates = useTemplates();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ControlTowerTemplateKind>('PROJECT');
  const [questionJson, setQuestionJson] = useState(pretty('PROJECT'));
  const createTemplate = useGlobalMutation(createControlTowerTemplate);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(
      async () => {
        const questions = JSON.parse(questionJson) as ControlTowerQuestion[];
        await createTemplate.mutateAsync({ name, kind, questions });
        setName('');
      },
      () => t('templates.saved'),
      { onError: (e) => (e instanceof SyntaxError ? t('templates.invalidJson') : errorMessage(e)) },
    );
  }

  return (
    <div className={common.twoCol}>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('templates.savedTitle')}</PanelTitle>
        </PanelHeader>
        <div className={common.body}>
          <TemplateList
            query={templates}
            row={(item) => (
              <div className={common.row} key={item.id}>
                <div>
                  <b>{item.name}</b>
                  <small>{t('templates.questions', { count: item.questions.length })}</small>
                </div>
                <StatusChip label={item.kind} kind="neutral" />
              </div>
            )}
          />
        </div>
      </Panel>
      {canWrite && (
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('templates.new')}</PanelTitle>
          </PanelHeader>
          <form className={common.body} onSubmit={onSubmit}>
            <TextField label={t('templates.name')} required value={name} onChange={setName} />
            <SelectField
              label={t('templates.kind')}
              value={kind}
              onChange={(value) => {
                const next = value as ControlTowerTemplateKind;
                setKind(next);
                setQuestionJson(pretty(next));
              }}
              options={[
                { value: 'PROJECT', label: t('templates.kindProject') },
                { value: 'FEATURE', label: t('templates.kindFeature') },
              ]}
            />
            <TextAreaField
              label={t('templates.questionsJson')}
              rows={13}
              className={styles.code}
              value={questionJson}
              onChange={setQuestionJson}
            />
            <div className={common.actions}>
              <Button variant="primary" type="submit" disabled={createTemplate.isPending}>
                {t('templates.save')}
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
