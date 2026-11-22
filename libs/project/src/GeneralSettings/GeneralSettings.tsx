import { useSelectedProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import { useSettingsFormLabels } from '@openjcockpit/settings';
import { SettingsForm, SettingsGroup } from '@openjcockpit/ui';
import { GeneralFields } from '../forms/ProjectFields';
import { WithTranslations } from '../registerTranslations';
import { useProjectDetails } from '../useProjectDetails';

/** Name, description, owner, environment and customer of the selected project. */
export function GeneralSettings() {
  const { t } = useTranslation('project');
  const labels = useSettingsFormLabels();
  const project = useSelectedProject();
  const { form, setForm, dirty, saving, saved, error, nameInvalid, nameInputRef, save, reset } =
    useProjectDetails(project);

  return (
    <SettingsGroup>
      <SettingsForm
        {...labels}
        savingLabel={t('form.saving')}
        savedLabel={t('general.saved')}
        dirty={dirty}
        saving={saving}
        saved={saved}
        // A missing name is reported on the field itself.
        error={nameInvalid ? null : error}
        onSubmit={() => void save()}
        onReset={reset}
      >
        <GeneralFields
          form={form}
          onChange={setForm}
          nameInvalid={nameInvalid}
          nameError={nameInvalid ? error : null}
          nameInputRef={nameInputRef}
        />
      </SettingsForm>
    </SettingsGroup>
  );
}

export default function GeneralSettingsSection() {
  return (
    <WithTranslations>
      <GeneralSettings />
    </WithTranslations>
  );
}
