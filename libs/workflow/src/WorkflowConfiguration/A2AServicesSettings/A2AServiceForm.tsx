import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import type { A2AService } from '@openjcockpit/api';
import {
  Button,
  SecretField,
  SettingsGroup,
  StatusMessage,
  TextField,
  cx,
  fieldHintClass,
  formActionsClass,
  formGridClass,
} from '@openjcockpit/ui';
import { EMPTY_A2A_FORM, toA2AFormState, type A2AServiceFormState } from './useA2AServices';
import WorkflowConfigurationStyles from '../WorkflowConfiguration.module.scss';

interface Props {
  /** The service being edited; null when adding. */
  editingService: A2AService | null;
  error: string | null;
  saving: boolean;
  onSave: (form: A2AServiceFormState) => Promise<boolean>;
  /** Path of the list this screen came from. */
  listPath: string;
}

/** The add / edit screen of one A2A service, separate from the list. */
export function A2AServiceForm({ editingService, error, saving, onSave, listPath }: Props) {
  const { t } = useTranslation('workflow');
  const navigate = useNavigate();
  const [form, setForm] = useState<A2AServiceFormState>(
    editingService ? toA2AFormState(editingService) : EMPTY_A2A_FORM,
  );

  return (
    <SettingsGroup
      title={
        editingService
          ? t('a2aServices.formTitleEdit', { name: editingService.name })
          : t('a2aServices.formTitleAdd')
      }
    >
      {error && (
        <StatusMessage variant="error" role="alert">
          {error}
        </StatusMessage>
      )}
      <p className={fieldHintClass}>{t('a2aServices.formHint')}</p>
      <div className={cx(formGridClass, WorkflowConfigurationStyles.servicesFormGrid)}>
        <TextField
          label={t('a2aServices.fields.id')}
          required
          value={form.id}
          onChange={(v) => setForm((f) => ({ ...f, id: v }))}
          placeholder={t('a2aServices.fields.idPlaceholder')}
          disabled={editingService !== null}
          hint={
            editingService ? t('a2aServices.fields.idHintEdit') : t('a2aServices.fields.idHintAdd')
          }
        />
        <TextField
          label={t('a2aServices.fields.name')}
          required
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder={t('a2aServices.fields.namePlaceholder')}
        />
        <TextField
          label={t('a2aServices.fields.baseUrl')}
          required
          value={form.baseUrl}
          onChange={(v) => setForm((f) => ({ ...f, baseUrl: v }))}
          placeholder={t('a2aServices.fields.baseUrlPlaceholder')}
          hint={t('a2aServices.fields.baseUrlHint')}
        />
        <TextField
          label={t('a2aServices.fields.publicUrl')}
          value={form.publicUrl}
          onChange={(v) => setForm((f) => ({ ...f, publicUrl: v }))}
          placeholder={t('a2aServices.fields.publicUrlPlaceholder')}
          hint={t('a2aServices.fields.publicUrlHint')}
        />
        <SecretField
          label={
            editingService ? t('a2aServices.fields.apiKeyEdit') : t('a2aServices.fields.apiKeyAdd')
          }
          hasValue={editingService?.hasApiKey ?? false}
          required={!editingService}
          value={form.apiKey}
          onChange={(v) => setForm((f) => ({ ...f, apiKey: v }))}
        />
        <TextField
          label={t('a2aServices.fields.callerTokenUrl')}
          value={form.callerTokenUrl}
          onChange={(v) => setForm((f) => ({ ...f, callerTokenUrl: v }))}
          placeholder={t('a2aServices.fields.callerTokenUrlPlaceholder')}
          hint={t('a2aServices.fields.callerTokenUrlHint')}
        />
        <TextField
          label={t('a2aServices.fields.callerClientId')}
          value={form.callerClientId}
          onChange={(v) => setForm((f) => ({ ...f, callerClientId: v }))}
          placeholder={t('a2aServices.fields.callerClientIdPlaceholder')}
        />
        <SecretField
          label={t('a2aServices.fields.callerClientSecret')}
          hasValue={editingService?.hasCallerClientSecret ?? false}
          value={form.callerClientSecret}
          onChange={(v) => setForm((f) => ({ ...f, callerClientSecret: v }))}
        />
      </div>
      <div className={formActionsClass}>
        <Button
          variant="primary"
          onClick={() => void onSave(form).then((ok) => ok && void navigate(listPath || '/'))}
          disabled={saving}
        >
          {saving
            ? t('shared.saving')
            : editingService
              ? t('a2aServices.saveService')
              : t('a2aServices.addService')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => void navigate(listPath || '/')}
          disabled={saving}
        >
          {t('shared.cancel')}
        </Button>
      </div>
    </SettingsGroup>
  );
}
