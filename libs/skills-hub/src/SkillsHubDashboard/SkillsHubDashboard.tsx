import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import {
  Icon,
  IconBox,
  StatusChip,
  AppShell,
  AppHeader,
  Eyebrow,
  Panel,
  DataTable,
  LoadingState,
  StatusMessage,
  fieldHintClass,
  formInputClass,
  cx,
  Button,
  pageClass,
  pageHeaderClass,
} from '@openjcockpit/ui';
import { useTranslation } from '@openjcockpit/i18n';
import { skillDetailPath, useSkillCatalog } from '../useSkillCatalog';
import styles from './SkillsHubDashboard.module.scss';

interface Props {
  onBack: () => void;
  onSettings: () => void;
  /** Replaces the default back-button header, e.g. with the app's shared top menu. */
  header?: ReactNode;
}

export function SkillsHubDashboard({ onBack, onSettings, header }: Props) {
  const [term, setTerm] = useState('');
  const { t } = useTranslation('skillsHub');
  const { query: catalog, skills } = useSkillCatalog();

  const visibleSkills = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return skills;
    return skills.filter((skill) =>
      [skill.name, skill.description ?? '', skill.sourceName].some((text) =>
        text.toLowerCase().includes(needle),
      ),
    );
  }, [skills, term]);

  const failedSources = (catalog.data?.sources ?? []).flatMap((source) =>
    source.outcome === 'SUCCESS' ? [] : [{ ...source, outcome: source.outcome }],
  );

  return (
    <AppShell>
      {header ?? <AppHeader onBack={onBack} backTitle={t('dashboard.backTitle')} />}

      <main className={pageClass}>
        <div className={cx(pageHeaderClass, styles.skillsHubHeader)}>
          <div>
            <Eyebrow>{t('eyebrow')}</Eyebrow>
            <h1>{t('dashboard.title')}</h1>
          </div>
          <Button variant="secondary" onClick={onSettings} title={t('dashboard.settingsTitle')}>
            <Icon name="settings" /> {t('dashboard.settings')}
          </Button>
        </div>

        <div className={styles.skillsHubSearch} role="search">
          <Icon name="search" />
          <input
            className={cx(formInputClass, styles.skillsHubSearchInput)}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t('dashboard.searchPlaceholder')}
            aria-label={t('dashboard.searchLabel')}
          />
        </div>

        {failedSources.map((source) => (
          <StatusMessage key={`${source.kind}:${source.marketplaceId}`} variant="error">
            {t('dashboard.sourceFailed', {
              name: source.name,
              outcome: t(`dashboard.outcome.${source.outcome}`),
            })}
          </StatusMessage>
        ))}

        {catalog.isPending && <LoadingState>{t('dashboard.loading')}</LoadingState>}
        {catalog.isError && (
          <StatusMessage variant="error">{t('dashboard.loadError')}</StatusMessage>
        )}

        {catalog.isSuccess && (
          <Panel as="div" className={styles.skillsHubPanel}>
            <DataTable className={styles.skillsHubTable}>
              <thead>
                <tr>
                  <th>{t('dashboard.columnSkill')}</th>
                  <th>{t('dashboard.columnSource')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleSkills.map((skill) => (
                  <tr key={`${skill.source}/${skill.name}`}>
                    <td>
                      <Link
                        to={skillDetailPath(skill.source, skill.name)}
                        className={styles.skillRowLink}
                      >
                        <span className={styles.skillRow}>
                          <IconBox label={<Icon name="check-circle" />} compact />
                          <span>
                            <strong>{skill.name}</strong> <span>{skill.description}</span>
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <StatusChip
                        label={skill.sourceName}
                        kind={skill.isLocal ? 'done' : 'active'}
                      />
                    </td>
                  </tr>
                ))}
                {visibleSkills.length === 0 && (
                  <tr>
                    <td colSpan={2} className={fieldHintClass}>
                      {term.trim() ? t('dashboard.noResults', { term }) : t('dashboard.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </DataTable>
          </Panel>
        )}
      </main>
    </AppShell>
  );
}
