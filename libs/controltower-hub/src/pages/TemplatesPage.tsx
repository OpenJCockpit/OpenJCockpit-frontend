import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  PanelHeader,
  PanelTitle,
  SelectField,
  StatusChip,
  StatusMessage,
  TextAreaField,
  TextField,
} from '@openjcockpit/ui';
import {
  createControlTowerSpecTemplate,
  createControlTowerTemplate,
  type ControlTowerQuestion,
  type ControlTowerTemplateKind,
} from '@openjcockpit/api';
import { errorMessage } from '../errorMessage';
import { useRepositoryMutation, useSpecTemplates, useTemplates } from '../hooks';
import { useWriteAccess } from '../useWriteAccess';
import { DEFAULT_SPEC_TEMPLATE, sampleQuestions } from './sampleQuestions';
import styles from './pages.module.scss';

const pretty = (kind: ControlTowerTemplateKind) => JSON.stringify(sampleQuestions(kind), null, 2);

/** Interview questionnaires and spec file templates. Global: they are shared by every repository. */
export function TemplatesPage() {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const templates = useTemplates();
  const specTemplates = useSpecTemplates();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ControlTowerTemplateKind>('PROJECT');
  const [questionJson, setQuestionJson] = useState(pretty('PROJECT'));
  const [specName, setSpecName] = useState('');
  const [specContent, setSpecContent] = useState(DEFAULT_SPEC_TEMPLATE);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createTemplate = useRepositoryMutation(null, createControlTowerTemplate);
  const createSpecTemplate = useRepositoryMutation(null, createControlTowerSpecTemplate);

  async function run(action: () => Promise<void>, success: string) {
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setError(e instanceof SyntaxError ? t('templates.invalidJson') : errorMessage(e));
    }
  }

  function saveTemplate(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const questions = JSON.parse(questionJson) as ControlTowerQuestion[];
      await createTemplate.mutateAsync({ name, kind, questions });
      setName('');
    }, t('templates.saved'));
  }

  function saveSpecTemplate(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await createSpecTemplate.mutateAsync({ name: specName, content: specContent });
      setSpecName('');
    }, t('templates.specSaved'));
  }

  function list<T extends { id: string }>(
    query: { data?: T[]; isError: boolean; refetch: () => unknown },
    empty: string,
    row: (item: T) => ReactNode,
  ) {
    if (query.data) {
      return query.data.length ? query.data.map(row) : <EmptyState title={empty} />;
    }
    if (query.isError) {
      return (
        <ErrorState onRetry={() => void query.refetch()} retryLabel={t('retry')}>
          {t('templates.loadFailed')}
        </ErrorState>
      );
    }
    return <LoadingState>{t('loading')}</LoadingState>;
  }

  return (
    <>
      {message && <StatusMessage role="status">{message}</StatusMessage>}
      {error && (
        <StatusMessage variant="error" role="alert">
          {error}
        </StatusMessage>
      )}
      <div className={styles.twoCol}>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('templates.savedTitle')}</PanelTitle>
          </PanelHeader>
          <div className={styles.body}>
            {list(templates, t('templates.none'), (item) => (
              <div className={styles.row} key={item.id}>
                <div>
                  <b>{item.name}</b>
                  <small>{t('templates.questions', { count: item.questions.length })}</small>
                </div>
                <StatusChip label={item.kind} kind="neutral" />
              </div>
            ))}
          </div>
        </Panel>
        {canWrite && (
          <Panel>
            <PanelHeader>
              <PanelTitle>{t('templates.new')}</PanelTitle>
            </PanelHeader>
            <form className={styles.body} onSubmit={saveTemplate}>
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
              <div className={styles.actions}>
                <Button variant="primary" type="submit" disabled={createTemplate.isPending}>
                  {t('templates.save')}
                </Button>
              </div>
            </form>
          </Panel>
        )}
      </div>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('templates.specTitle')}</PanelTitle>
          <StatusChip label={t('templates.markdown')} kind="neutral" />
        </PanelHeader>
        <div className={styles.body}>
          <StatusMessage>{t('templates.specHint')}</StatusMessage>
          <div className={styles.twoCol}>
            <div>
              {list(specTemplates, t('templates.none'), (item) => (
                <div className={styles.row} key={item.id}>
                  <div>
                    <b>{item.name}</b>
                    <small>
                      {item.defaultTemplate ? t('templates.builtIn') : t('templates.custom')}
                    </small>
                  </div>
                  <StatusChip label={t('templates.markdown')} kind="neutral" />
                </div>
              ))}
            </div>
            {canWrite && (
              <form className={styles.body} onSubmit={saveSpecTemplate}>
                <TextField
                  label={t('templates.name')}
                  required
                  value={specName}
                  onChange={setSpecName}
                />
                <TextAreaField
                  label={t('templates.markdownTemplate')}
                  rows={11}
                  className={styles.code}
                  value={specContent}
                  onChange={setSpecContent}
                />
                <div className={styles.actions}>
                  <Button variant="primary" type="submit" disabled={createSpecTemplate.isPending}>
                    {t('templates.saveSpec')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
