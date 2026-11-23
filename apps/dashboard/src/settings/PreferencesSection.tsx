import { useContext } from 'react';
import {
  LOCALE_NAMES,
  type Locale,
  SUPPORTED_LOCALES,
  useLocale,
  useTranslation,
} from '@openjcockpit/i18n';
import { HubThemeContext, isThemePreference, THEME_PREFERENCES } from '@openjcockpit/hub-contract';
import { Select, SettingsGroup, SettingsRow } from '@openjcockpit/ui';

/** Per-user display preferences: the language and the colour theme. */
export default function PreferencesSection() {
  const { t } = useTranslation('dashboard');
  const { locale, setLocale } = useLocale();
  // Absent in a standalone harness, where there is no host theme to change.
  const theme = useContext(HubThemeContext);

  return (
    <SettingsGroup>
      <SettingsRow label={t('siteHeader.language')} htmlFor="locale-select">
        <Select
          field
          id="locale-select"
          value={locale}
          options={SUPPORTED_LOCALES.map((code) => ({
            value: code,
            label: LOCALE_NAMES[code],
            lang: code,
          }))}
          // A failed locale download keeps the current language; the select stays on it.
          onChange={(code) => void setLocale(code as Locale).catch(() => undefined)}
          data-testid="locale-select"
        />
      </SettingsRow>
      {theme && (
        <SettingsRow label={t('siteHeader.theme')} htmlFor="theme-select">
          <Select
            field
            id="theme-select"
            value={theme.preference}
            options={THEME_PREFERENCES.map((preference) => ({
              value: preference,
              label: t(`siteHeader.themes.${preference}`),
            }))}
            onChange={(value) => isThemePreference(value) && theme.setPreference(value)}
            data-testid="theme-select"
          />
        </SettingsRow>
      )}
    </SettingsGroup>
  );
}
