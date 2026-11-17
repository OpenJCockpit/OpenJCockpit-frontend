import { useTranslation } from '@openjcockpit/i18n';
import { Button, CheckboxField, TextAreaField, TextField } from '@openjcockpit/ui';
import type { ControlTowerQuestion } from '@openjcockpit/api';
import styles from './TemplatesPage.module.scss';

interface Props {
  questions: ControlTowerQuestion[];
  onChange: (questions: ControlTowerQuestion[]) => void;
}

/** An id no other question uses yet: `question-1`, `question-2`, ... */
export function nextQuestionId(questions: ControlTowerQuestion[]): string {
  const used = new Set(questions.map((q) => q.id));
  let n = questions.length + 1;
  while (used.has(`question-${n}`)) n += 1;
  return `question-${n}`;
}

/** Form editor for interview questions: edit, add, remove and reorder. */
export function QuestionEditor({ questions, onChange }: Props) {
  const { t } = useTranslation('controltower');

  const update = (index: number, patch: Partial<ControlTowerQuestion>) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  const add = () =>
    onChange([
      ...questions,
      {
        id: nextQuestionId(questions),
        text: '',
        required: true,
        maxFollowUps: 2,
        completionCriteria: '',
      },
    ]);

  return (
    <div className={styles.questionEditor}>
      {questions.map((question, index) => (
        <fieldset key={question.id} className={styles.question}>
          <legend>{t('templates.questionN', { number: index + 1 })}</legend>
          <TextAreaField
            label={t('templates.questionText')}
            rows={2}
            required
            value={question.text}
            onChange={(text) => update(index, { text })}
          />
          <TextField
            label={t('templates.completionCriteria')}
            value={question.completionCriteria}
            onChange={(completionCriteria) => update(index, { completionCriteria })}
          />
          <TextField
            label={t('templates.maxFollowUps')}
            type="number"
            min={0}
            value={String(question.maxFollowUps)}
            onChange={(value) =>
              update(index, { maxFollowUps: Math.max(0, Number.parseInt(value, 10) || 0) })
            }
          />
          <CheckboxField
            label={t('templates.required')}
            checked={question.required}
            onChange={(required) => update(index, { required })}
          />
          <div className={styles.questionActions}>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={index === 0}
              aria-label={t('templates.moveUp', { number: index + 1 })}
              onClick={() => move(index, -1)}
            >
              {t('templates.up')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={index === questions.length - 1}
              aria-label={t('templates.moveDown', { number: index + 1 })}
              onClick={() => move(index, 1)}
            >
              {t('templates.down')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              aria-label={t('templates.removeQuestion', { number: index + 1 })}
              onClick={() => onChange(questions.filter((_, i) => i !== index))}
            >
              {t('templates.remove')}
            </Button>
          </div>
        </fieldset>
      ))}
      <Button type="button" variant="secondary" onClick={add}>
        {t('templates.addQuestion')}
      </Button>
    </div>
  );
}
