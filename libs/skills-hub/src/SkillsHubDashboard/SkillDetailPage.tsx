import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import {
  AppShell,
  AppHeader,
  Button,
  Eyebrow,
  Icon,
  LoadingState,
  Panel,
  StatusChip,
  StatusMessage,
  fieldHintClass,
  pageClass,
  pageHeaderClass,
} from '@openjcockpit/ui';
import { useTranslation } from '@openjcockpit/i18n';
import { useSkillCatalog, type CatalogSkill } from '../useSkillCatalog';
import styles from './SkillsHubDashboard.module.scss';

interface Props {
  /** Back to the skill list. */
  onBack: () => void;
  /** Replaces the default back-button header, e.g. with the app's shared top menu. */
  header?: ReactNode;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.skillDetailField}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SkillDetails({ skill }: { skill: CatalogSkill }) {
  const { t } = useTranslation('skillsHub');
  const { spec } = skill;
  return (
    <dl className={styles.skillDetailList}>
      <Field label={t('detail.description')}>
        {skill.description || <span className={fieldHintClass}>{t('detail.noDescription')}</span>}
      </Field>
      {spec ? (
        <>
          <Field label={t('detail.inputContract')}>{spec.inputContract}</Field>
          <Field label={t('detail.outputContract')}>{spec.outputContract}</Field>
          <Field label={t('detail.executionInstructions')}>
            <pre className={styles.skillDetailPre}>{spec.executionInstructions}</pre>
          </Field>
          {spec.policyNotes && <Field label={t('detail.policyNotes')}>{spec.policyNotes}</Field>}
          <Field label={t('detail.mcpTools')}>
            {spec.mcpTools.length === 0 ? (
              <span className={fieldHintClass}>{t('detail.noMcpTools')}</span>
            ) : (
              <ul className={styles.skillDetailTools}>
                {spec.mcpTools.map((tool) => (
                  <li key={tool.name}>
                    <strong>{tool.name}</strong> <span>{tool.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </>
      ) : (
        <p className={fieldHintClass}>{t('detail.externalNote')}</p>
      )}
    </dl>
  );
}

/** Detail page of one skill, addressed by `:source` (`local` or a marketplace id) and `:name`. */
export function SkillDetailPage({ onBack, header }: Props) {
  const { t } = useTranslation('skillsHub');
  const { source, name } = useParams();
  const { query, skills } = useSkillCatalog();
  const skill = skills.find((s) => s.source === source && s.name === name);
  const content = renderContent();

  return (
    <AppShell>
      {header ?? <AppHeader onBack={onBack} backTitle={t('detail.backTitle')} />}
      <main className={pageClass}>
        <div className={pageHeaderClass}>
          <div>
            <Eyebrow>{t('eyebrow')}</Eyebrow>
            <h1>{name}</h1>
            {skill && (
              <StatusChip label={skill.sourceName} kind={skill.isLocal ? 'done' : 'active'} />
            )}
          </div>
        </div>
        <div className={styles.skillDetailBack}>
          <Button variant="secondary" onClick={onBack}>
            <Icon name="arrow-left" /> {t('detail.allSkills')}
          </Button>
        </div>
        {content}
      </main>
    </AppShell>
  );

  function renderContent(): ReactNode {
    if (query.isPending) return <LoadingState>{t('detail.loading')}</LoadingState>;
    if (query.isError) {
      return <StatusMessage variant="error">{t('detail.loadError')}</StatusMessage>;
    }
    if (!skill) return <StatusMessage variant="error">{t('detail.notFound')}</StatusMessage>;
    return (
      <Panel as="div" className={styles.skillDetailPanel}>
        <SkillDetails skill={skill} />
      </Panel>
    );
  }
}
