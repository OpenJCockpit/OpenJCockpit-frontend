import { useState, type FormEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Button,
  ListRow,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  SelectField,
  StatusChip,
  TextAreaField,
  TextField,
  TwoColumn,
  useConfirmDialog,
} from '@openjcockpit/ui';
import {
  createControlTowerTemplate,
  deleteControlTowerTemplate,
  updateControlTowerTemplate,
  type ControlTowerQuestion,
  type ControlTowerTemplate,
  type ControlTowerTemplateKind,
} from '@openjcockpit/api';
import { errorMessage } from '../errorMessage';
import { useGlobalMutation, useTemplates } from '../hooks';
import type { RunAction } from '../useAction';
import { useWriteAccess } from '../useWriteAccess';
import { sampleQuestions } from '../sampleQuestions';
import { QuestionEditor } from './QuestionEditor';
import { TemplateList } from './TemplateList';
import styles from './TemplatesPage.module.scss';

const pretty = (questions: ControlTowerQuestion[]) => JSON.stringify(questions, null, 2);
const same = (a: ControlTowerQuestion[], b: ControlTowerQuestion[]) => pretty(a) === pretty(b);

/** Saved interview questionnaires and the form that adds or edits one. */
export function QuestionTemplatesPanel({ run }: { run: RunAction }) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const templates = useTemplates();
  const { confirm, dialog } = useConfirmDialog();
  /** The saved template being edited; `null` while adding a new one. */
  const [editing, setEditing] = useState<ControlTowerTemplate | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ControlTowerTemplateKind>('PROJECT');
  const [questions, setQuestions] = useState(() => sampleQuestions('PROJECT'));
  /** What the questions started as; a kind change only asks before discarding other content. */
  const [baseline, setBaseline] = useState(() => sampleQuestions('PROJECT'));
  const [asJson, setAsJson] = useState(false);
  const [json, setJson] = useState('');
  const createTemplate = useGlobalMutation(createControlTowerTemplate);
  const updateTemplate = useGlobalMutation(
    (body: {
      id: string;
      name: string;
      kind: ControlTowerTemplateKind;
      questions: ControlTowerQuestion[];
    }) =>
      updateControlTowerTemplate(body.id, {
        name: body.name,
        kind: body.kind,
        questions: body.questions,
      }),
  );
  const deleteTemplate = useGlobalMutation(deleteControlTowerTemplate);
  const pending = createTemplate.isPending || updateTemplate.isPending;

  function load(next: {
    editing: ControlTowerTemplate | null;
    name: string;
    kind: ControlTowerTemplateKind;
    questions: ControlTowerQuestion[];
  }) {
    setEditing(next.editing);
    setName(next.name);
    setKind(next.kind);
    setQuestions(next.questions);
    setBaseline(next.questions);
    setAsJson(false);
  }

  const reset = () => load({ editing: null, name: '', kind, questions: sampleQuestions(kind) });

  function changeKind(next: ControlTowerTemplateKind) {
    const apply = () => {
      setKind(next);
      if (!editing) {
        const samples = sampleQuestions(next);
        setQuestions(samples);
        setBaseline(samples);
        setJson(pretty(samples));
      }
    };
    if (!editing && !same(questions, baseline)) {
      confirm({
        title: t('templates.replaceTitle'),
        message: t('templates.replaceMessage'),
        confirmLabel: t('templates.replace'),
        cancelLabel: t('cancel'),
        busyLabel: t('templates.replace'),
        tone: 'primary',
        onConfirm: apply,
      });
      return;
    }
    apply();
  }

  function toggleJson() {
    if (!asJson) {
      setJson(pretty(questions));
      setAsJson(true);
      return;
    }
    try {
      setQuestions(JSON.parse(json) as ControlTowerQuestion[]);
      setAsJson(false);
    } catch {
      void run(() => Promise.reject(new SyntaxError('invalid')), undefined, {
        onError: () => t('templates.invalidJson'),
      });
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(
      async () => {
        const body = {
          name,
          kind,
          questions: asJson ? (JSON.parse(json) as ControlTowerQuestion[]) : questions,
        };
        if (editing) await updateTemplate.mutateAsync({ id: editing.id, ...body });
        else await createTemplate.mutateAsync(body);
        reset();
      },
      () => t('templates.saved'),
      { onError: (e) => (e instanceof SyntaxError ? t('templates.invalidJson') : errorMessage(e)) },
    );
  }

  const askDelete = (item: ControlTowerTemplate) =>
    confirm({
      title: t('templates.deleteTitle'),
      message: t('templates.deleteMessage', { name: item.name }),
      confirmLabel: t('templates.delete'),
      cancelLabel: t('cancel'),
      busyLabel: t('templates.deleting'),
      onConfirm: () =>
        run(
          async () => {
            await deleteTemplate.mutateAsync(item.id);
            if (editing?.id === item.id) reset();
          },
          () => t('templates.deleted'),
        ),
    });

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <PanelTitle>{t('templates.savedTitle')}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <TemplateList
            query={templates}
            row={(item) => (
              <ListRow key={item.id}>
                <div>
                  <b>{item.name}</b>
                  <small>{t('templates.questions', { count: item.questions.length })}</small>
                </div>
                <StatusChip label={t(`kind.${item.kind}`)} kind="neutral" />
                {canWrite && (
                  <div className={styles.rowActions}>
                    {!item.builtIn && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        aria-label={t('templates.editNamed', { name: item.name })}
                        onClick={() =>
                          load({
                            editing: item,
                            name: item.name,
                            kind: item.kind,
                            questions: item.questions,
                          })
                        }
                      >
                        {t('templates.edit')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      aria-label={t('templates.duplicateNamed', { name: item.name })}
                      onClick={() =>
                        load({
                          editing: null,
                          name: t('templates.copyName', { name: item.name }),
                          kind: item.kind,
                          questions: item.questions,
                        })
                      }
                    >
                      {t('templates.duplicate')}
                    </Button>
                    {!item.builtIn && (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        aria-label={t('templates.deleteNamed', { name: item.name })}
                        onClick={() => askDelete(item)}
                      >
                        {t('templates.delete')}
                      </Button>
                    )}
                  </div>
                )}
              </ListRow>
            )}
          />
        </PanelBody>
      </Panel>
      {canWrite && (
        <Panel>
          <PanelHeader>
            <PanelTitle>
              {editing ? t('templates.editing', { name: editing.name }) : t('templates.new')}
            </PanelTitle>
          </PanelHeader>
          <PanelBody as="form" onSubmit={onSubmit}>
            <TextField label={t('templates.name')} required value={name} onChange={setName} />
            <SelectField
              label={t('templates.kind')}
              value={kind}
              onChange={(value) => changeKind(value as ControlTowerTemplateKind)}
              options={[
                { value: 'PROJECT', label: t('templates.kindProject') },
                { value: 'FEATURE', label: t('templates.kindFeature') },
              ]}
            />
            {asJson ? (
              <TextAreaField
                label={t('templates.questionsJson')}
                rows={13}
                className={styles.code}
                value={json}
                onChange={setJson}
              />
            ) : (
              <QuestionEditor questions={questions} onChange={setQuestions} />
            )}
            <ActionRow>
              <Button variant="primary" type="submit" disabled={pending}>
                {editing ? t('templates.update') : t('templates.save')}
              </Button>
              <Button type="button" variant="secondary" onClick={toggleJson}>
                {asJson ? t('templates.useEditor') : t('templates.editAsJson')}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={reset}>
                  {t('cancel')}
                </Button>
              )}
            </ActionRow>
          </PanelBody>
        </Panel>
      )}
      {dialog}
    </TwoColumn>
  );
}
