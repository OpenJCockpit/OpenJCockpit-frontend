import { useSelectedProject } from '@openjcockpit/hub-contract';
import { useTranslation } from '@openjcockpit/i18n';
import {
  Button,
  StatusMessage,
  fieldErrorClass,
  formActionsClass,
  formGridClass,
} from '@openjcockpit/ui';
import { GeneralFields } from '../forms/ProjectFields';
import { WithTranslations } from '../registerTranslations';
import { useProjectDetails } from '../useProjectDetails';

/** Name, description, owner, environment and customer of the selected project. */
export function GeneralSettings() {
  const { t } = useTranslation('project');
  const project = useSelectedProject();
  const { form, setForm, saving, saved, error, nameInvalid, nameInputRef, save } =
    useProjectDetails(project);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className={formGridClass}>
        <GeneralFields
          form={form}
          onChange={setForm}
          nameInvalid={nameInvalid}
          nameError={nameInvalid ? error : null}
          nameInputRef={nameInputRef}
        />
      </div>
      {error && !nameInvalid && (
        <p role="alert" className={fieldErrorClass}>
          {error}
        </p>
      )}
      {saved && <StatusMessage>{t('general.saved')}</StatusMessage>}
      <div className={formActionsClass}>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? t('form.saving') : t('form.save')}
        </Button>
      </div>
    </form>
  );
}

export default function GeneralSettingsSection() {
  return (
    <WithTranslations>
      <GeneralSettings />
    </WithTranslations>
  );
}
