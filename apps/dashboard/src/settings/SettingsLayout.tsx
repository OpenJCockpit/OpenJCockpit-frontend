import { useMemo } from 'react';
import { NavLink, Navigate, Route, Routes, useParams } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  FORBIDDEN_PATH,
  useAppRegistry,
  settingsPath,
  useGuardedNavigation,
  useHubHeader,
  useHubProject,
  type SettingsGroupKey,
  type SettingsScreen,
  type SettingsSectionDefinition,
} from '@openjcockpit/hub-contract';
import {
  AppShell,
  Eyebrow,
  Icon,
  Panel,
  StatusMessage,
  cx,
  isIconName,
  pageClass,
  pageHeaderClass,
} from '@openjcockpit/ui';
import { useProjectSetupComplete } from '@openjcockpit/project';
import { NotFound } from '../routeViews/NotFound';
import { SectionFrame } from './SectionFrame';
import { SettingsDirtyProvider } from './SettingsDirtyProvider';
import styles from './SettingsLayout.module.scss';

/** Id of the project setup checklist section (contributed by the projects app). */
const SETUP_CHECKLIST_ID = 'overview';

const DEFAULT_GROUP: SettingsGroupKey = 'settings.groups.other';

export interface SettingsGroup {
  key: SettingsGroupKey;
  sections: SettingsSectionDefinition[];
}

/** Groups by `groupKey`, ordered by the lowest `order` of their sections; sections are pre-sorted. */
export function groupSections(sections: readonly SettingsSectionDefinition[]): SettingsGroup[] {
  const groups = new Map<SettingsGroupKey, SettingsSectionDefinition[]>();
  for (const section of sections) {
    const key = section.groupKey ?? DEFAULT_GROUP;
    groups.set(key, [...(groups.get(key) ?? []), section]);
  }
  return [...groups].map(([key, list]) => ({ key, sections: list }));
}

/** The sections one screen shows: `visibleSettings` already holds only what the session may open. */
export function useScreenSections(screen: SettingsScreen) {
  const { visibleSettings } = useAppRegistry();
  return useMemo(
    () => visibleSettings.filter((section) => (section.screen ?? 'settings') === screen),
    [visibleSettings, screen],
  );
}

/** Text of a key a remote contributed: not part of the host's typed catalog. */
function useRemoteText() {
  const { t } = useTranslation('dashboard');
  return (key: string) => String(t(key as never));
}

function SettingsNav({
  sections,
  screen,
}: {
  sections: readonly SettingsSectionDefinition[];
  screen: SettingsScreen;
}) {
  const { t } = useTranslation('dashboard');
  const text = useRemoteText();
  const groups = useMemo(() => groupSections(sections), [sections]);
  const guarded = useGuardedNavigation();
  const { selected } = useHubProject();
  return (
    <Panel
      as="nav"
      className={styles.nav}
      aria-label={t(screen === 'project' ? 'settings.projectNavigation' : 'settings.navigation')}
      data-testid="settings-nav"
    >
      {groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <p className={styles.groupTitle}>{text(group.key)}</p>
          {group.sections.map((section) => {
            const to = settingsPath(section);
            const locked = section.requiresProject && !selected;
            return (
              <NavLink
                key={section.id}
                to={to}
                onClick={(event) => guarded(event, to)}
                className={({ isActive }) => cx(styles.link, isActive && styles.active)}
                data-testid={`settings-nav-${section.id}`}
              >
                {section.icon && isIconName(section.icon) ? (
                  <Icon name={section.icon} className={styles.linkIcon} />
                ) : null}
                {text(section.titleKey)}
                {locked ? (
                  <span
                    className={styles.lockIcon}
                    role="img"
                    aria-label={t('settings.projectRequired')}
                    title={t('settings.projectRequired')}
                  >
                    <Icon name="lock" />
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      ))}
    </Panel>
  );
}

/** `/settings/*` or `/project-settings/*`: the screen's sub-navigation next to the active section. */
export function SettingsLayout({ screen = 'settings' }: { screen?: SettingsScreen }) {
  const { t } = useTranslation('dashboard');
  const header = useHubHeader();
  const { allApps } = useAppRegistry();
  const screenSections = useScreenSections(screen);
  const setupComplete = useProjectSetupComplete();
  // The setup checklist has nothing left to show once the project is fully set up.
  const visibleSettings = useMemo(
    () =>
      setupComplete
        ? screenSections.filter((section) => section.id !== SETUP_CHECKLIST_ID)
        : screenSections,
    [screenSections, setupComplete],
  );
  const first = visibleSettings[0];

  const known = useMemo(
    () =>
      new Set(
        allApps
          .flatMap((app) => app.settings ?? [])
          .filter((section) => (section.screen ?? 'settings') === screen)
          .map((section) => section.id),
      ),
    [allApps, screen],
  );

  return (
    <AppShell>
      {header}
      <main
        className={pageClass}
        data-testid={screen === 'project' ? 'project-settings' : 'settings'}
      >
        <div className={pageHeaderClass}>
          <Eyebrow>
            {t(screen === 'project' ? 'settings.projectEyebrow' : 'settings.eyebrow')}
          </Eyebrow>
        </div>
        {first ? (
          <SettingsDirtyProvider>
            <div className={styles.layout}>
              <SettingsNav sections={visibleSettings} screen={screen} />
              <div className={styles.content}>
                <Routes>
                  <Route index element={<Navigate to={settingsPath(first)} replace />} />
                  {visibleSettings.map((section) => (
                    <Route
                      key={section.id}
                      path={`${section.id}/*`}
                      element={<SectionFrame section={section} />}
                    />
                  ))}
                  {setupComplete ? (
                    <Route
                      path={SETUP_CHECKLIST_ID}
                      element={<Navigate to=".." replace relative="path" />}
                    />
                  ) : null}
                  <Route path=":sectionId" element={<UnavailableSection known={known} />} />
                </Routes>
              </div>
            </div>
          </SettingsDirtyProvider>
        ) : (
          <StatusMessage data-testid="settings-empty">{t('settings.empty')}</StatusMessage>
        )}
      </main>
    </AppShell>
  );
}

/** A section that is not visible: unknown ids are 404, known-but-not-permitted ones are 403. */
function UnavailableSection({ known }: { known: ReadonlySet<string> }) {
  const { sectionId = '' } = useParams();
  return known.has(sectionId) ? <Navigate to={FORBIDDEN_PATH} replace /> : <NotFound />;
}
