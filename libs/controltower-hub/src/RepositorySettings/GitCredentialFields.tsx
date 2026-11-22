import { useTranslation } from '@openjcockpit/i18n';
import { SecretField, SelectField, TextField } from '@openjcockpit/ui';
import type { ControlTowerCredentialType } from '@openjcockpit/api';

export interface GitCredentialValues {
  credentialType: ControlTowerCredentialType;
  gitUsername: string;
  secret: string;
}

interface Props extends GitCredentialValues {
  /** A secret is already stored; leaving the field empty keeps it. */
  hasStoredSecret: boolean;
  disabled?: boolean;
  onChange: (patch: Partial<GitCredentialValues>) => void;
}

/** Credential type, username and write-only secret of a Git remote. */
export function GitCredentialFields({
  credentialType,
  gitUsername,
  secret,
  hasStoredSecret,
  disabled,
  onChange,
}: Props) {
  const { t } = useTranslation('controltower');
  const token = credentialType === 'HTTPS_TOKEN';
  return (
    <>
      <SelectField
        label={t('repository.authentication')}
        disabled={disabled}
        value={credentialType}
        onChange={(value) => onChange({ credentialType: value as ControlTowerCredentialType })}
        options={[
          { value: 'NONE', label: t('repository.credential.NONE') },
          { value: 'HTTPS_TOKEN', label: t('repository.credential.HTTPS_TOKEN') },
          { value: 'USERNAME_PASSWORD', label: t('repository.credential.USERNAME_PASSWORD') },
        ]}
      />
      {credentialType !== 'NONE' && (
        <>
          <TextField
            label={t('repository.username')}
            required={credentialType === 'USERNAME_PASSWORD'}
            autoComplete="off"
            disabled={disabled}
            value={gitUsername}
            onChange={(value) => onChange({ gitUsername: value })}
            hint={token ? t('repository.usernameHint') : undefined}
          />
          <SecretField
            label={token ? t('repository.token') : t('repository.password')}
            hasValue={hasStoredSecret}
            disabled={disabled}
            required={!hasStoredSecret}
            value={secret}
            onChange={(value) => onChange({ secret: value })}
          />
        </>
      )}
    </>
  );
}
