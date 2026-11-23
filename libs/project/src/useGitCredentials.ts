import { useEffect, useRef, useState } from 'react';
import { deleteGitCredentials, getGitCredentials, saveGitCredentials } from '@openjcockpit/api';
import type { ProjectGitCredentialRequest } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { useReportSettingsDirty } from '@openjcockpit/ui';
import { useProjectCache } from './projectCache';

const EMPTY_CRED_FORM: ProjectGitCredentialRequest = {
  credentialType: 'NONE',
  username: '',
  secret: '',
  githubApiUrl: '',
};

/** The stored Git credentials of one project: loaded on mount, saved after a successful Git check by the backend. */
export function useGitCredentials(projectId: string) {
  const { t } = useTranslation('project');
  // Read through a ref so a new `t` (language or namespace change) does not re-run the credential load.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const updateProjects = useProjectCache();
  const [form, setForm] = useState<ProjectGitCredentialRequest>(EMPTY_CRED_FORM);
  // What the server holds: the loaded value, then the last saved one (the secret is write-only).
  const [baseline, setBaseline] = useState<ProjectGitCredentialRequest>(EMPTY_CRED_FORM);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useReportSettingsDirty(dirty);
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGitCredentials(projectId)
      .then((existing) => {
        if (cancelled) return;
        const loaded = {
          credentialType: existing.credentialType,
          username: existing.username ?? '',
          secret: '',
          githubApiUrl: existing.githubApiUrl ?? '',
        };
        setForm(loaded);
        setBaseline(loaded);
        setHasSecret(existing.hasSecret);
      })
      .catch(() => {
        if (!cancelled) setError(tRef.current('settings.errors.credentialsLoadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveGitCredentials(projectId, {
        ...form,
        secret: form.secret === '' ? null : form.secret,
      });
      updateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, hasCredentials: true } : p)),
      );
      setHasSecret(hasSecret || !!form.secret);
      // The secret is not kept in the form once it is stored.
      setForm((f) => ({ ...f, secret: '' }));
      setBaseline({ ...form, secret: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.errors.credentialsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setError(null);
    try {
      await deleteGitCredentials(projectId);
      updateProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, hasCredentials: false } : p)),
      );
      setForm(EMPTY_CRED_FORM);
      setBaseline(EMPTY_CRED_FORM);
      setHasSecret(false);
    } catch {
      setError(t('settings.errors.credentialsDeleteFailed'));
    }
  }

  return { form, setForm, dirty, hasSecret, loading, saving, error, save, remove };
}
