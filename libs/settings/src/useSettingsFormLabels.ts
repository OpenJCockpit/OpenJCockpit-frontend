import { useTranslation } from '@openjcockpit/i18n';

/** The standard Save / Saving / Saved / Reset texts for `SettingsForm`; a section may override any of them. */
export function useSettingsFormLabels() {
  const { t } = useTranslation();
  return {
    saveLabel: t('settingsForm.save'),
    savingLabel: t('settingsForm.saving'),
    savedLabel: t('settingsForm.saved'),
    resetLabel: t('settingsForm.reset'),
  };
}
