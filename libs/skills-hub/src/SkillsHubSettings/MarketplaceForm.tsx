import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import type {
  SkillsMarketplaceConnection,
  SkillsMarketplaceConnectionRequest,
} from '@openjcockpit/api';
import {
  Actions,
  Button,
  CheckboxField,
  SettingsGroup,
  StatusMessage,
  TextAreaField,
  TextField,
  formGridClass,
} from '@openjcockpit/ui';
import { EMPTY_MARKETPLACE_FORM, toMarketplaceForm } from './useSkillsHubSettings';
import styles from './SkillsHubSettings.module.scss';

interface Props {
  /** The connection being edited; null when adding. */
  editing: SkillsMarketplaceConnection | null;
  error: string | null;
  saving: boolean;
  onSave: (form: SkillsMarketplaceConnectionRequest) => Promise<boolean>;
  listPath: string;
}

/** The add / edit screen of one marketplace connection, separate from the list. */
export function MarketplaceForm({ editing, error, saving, onSave, listPath }: Props) {
  const { t } = useTranslation('skillsHub');
  const navigate = useNavigate();
  const editingId = editing?.id ?? null;
  const editingHasApiKey = editing?.hasApiKey ?? false;
  const [form, setForm] = useState<SkillsMarketplaceConnectionRequest>(
    editing ? toMarketplaceForm(editing) : EMPTY_MARKETPLACE_FORM,
  );

  return (
    <SettingsGroup title={editingId === null ? t('settings.formNew') : t('settings.formEdit')}>
      {error && (
        <StatusMessage variant="error" role="alert">
          {error}
        </StatusMessage>
      )}
      <div className={formGridClass}>
        <TextField
          label={t('settings.name')}
          required
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder={t('settings.namePlaceholder')}
        />
        <TextField
          label={t('settings.marketplaceUrl')}
          required
          value={form.marketplaceUrl}
          onChange={(v) => setForm((f) => ({ ...f, marketplaceUrl: v }))}
          placeholder={t('settings.marketplaceUrlPlaceholder')}
        />
        <TextField
          label={editingId === null ? t('settings.apiKeyRequired') : t('settings.apiKey')}
          required={editingId === null}
          type="password"
          value={form.apiKey!}
          onChange={(v) => setForm((f) => ({ ...f, apiKey: v }))}
          placeholder={
            editingId !== null && editingHasApiKey
              ? t('settings.apiKeyKeepPlaceholder')
              : t('settings.apiKeyRequiredPlaceholder')
          }
        />
        <TextAreaField
          label={t('settings.description')}
          wide
          rows={3}
          value={form.description!}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          placeholder={t('settings.descriptionPlaceholder')}
        />
        <CheckboxField
          label={t('settings.enabledField')}
          checked={form.enabled}
          onChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
        />
      </div>
      <Actions className={styles.formActions}>
        <Button
          variant="primary"
          onClick={() => void onSave(form).then((ok) => ok && void navigate(listPath || '/'))}
          disabled={saving}
        >
          {saving ? t('settings.saving') : t('settings.save')}
        </Button>
        <Button variant="secondary" onClick={() => void navigate(listPath || '/')}>
          {t('settings.cancel')}
        </Button>
      </Actions>
    </SettingsGroup>
  );
}
