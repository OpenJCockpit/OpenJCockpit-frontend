import { useState, type FormEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  Panel,
  PanelHeader,
  PanelTitle,
  StatusChip,
  StatusMessage,
  TextAreaField,
  TextField,
} from '@openjcockpit/ui';
import { createControlTowerSpecTemplate } from '@openjcockpit/api';
import { useGlobalMutation, useSpecTemplates } from '../hooks';
import type { RunAction } from '../useAction';
import { useWriteAccess } from '../useWriteAccess';
import { DEFAULT_SPEC_TEMPLATE } from '../sampleQuestions';
import common from '../shared.module.scss';
import { TemplateList } from './TemplateList';
import styles from './TemplatesPage.module.scss';

/** Markdown spec file templates and the form that adds one. */
export function SpecTemplatesPanel({ run }: { run: RunAction }) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const specTemplates = useSpecTemplates();
  const [name, setName] = useState('');
  const [content, setContent] = useState(DEFAULT_SPEC_TEMPLATE);
  const createSpecTemplate = useGlobalMutation(createControlTowerSpecTemplate);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(
      async () => {
        await createSpecTemplate.mutateAsync({ name, content });
        setName('');
      },
      () => t('templates.specSaved'),
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t('templates.specTitle')}</PanelTitle>
        <StatusChip label={t('templates.markdown')} kind="neutral" />
      </PanelHeader>
      <div className={common.body}>
        <StatusMessage>{t('templates.specHint')}</StatusMessage>
        <div className={common.twoCol}>
          <div>
            <TemplateList
              query={specTemplates}
              row={(item) => (
                <div className={common.row} key={item.id}>
                  <div>
                    <b>{item.name}</b>
                    <small>
                      {item.defaultTemplate ? t('templates.builtIn') : t('templates.custom')}
                    </small>
                  </div>
                  <StatusChip label={t('templates.markdown')} kind="neutral" />
                </div>
              )}
            />
          </div>
          {canWrite && (
            <form className={common.body} onSubmit={onSubmit}>
              <TextField label={t('templates.name')} required value={name} onChange={setName} />
              <TextAreaField
                label={t('templates.markdownTemplate')}
                rows={11}
                className={styles.code}
                value={content}
                onChange={setContent}
              />
              <div className={common.actions}>
                <Button variant="primary" type="submit" disabled={createSpecTemplate.isPending}>
                  {t('templates.saveSpec')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Panel>
  );
}
