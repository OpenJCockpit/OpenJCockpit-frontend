import { useEffect, useState } from 'react';
import { deleteGitCredentials, getGitCredentials, saveGitCredentials } from '@openjcockpit/api';
import type { ProjectGitCredentialRequest } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
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
  const updateProjects = useProjectCache();
  const [form, setForm] = useState<ProjectGitCredentialRequest>(EMPTY_CRED_FORM);
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGitCredentials(projectId)
      .then((existing) => {
        if (cancelled) return;
        setForm({
          credentialType: existing.credentialType,
          username: existing.username ?? '',
          secret: '',
          githubApiUrl: existing.githubApiUrl ?? '',
        });
        setHasSecret(existing.hasSecret);
      })
      .catch(() => {
        if (!cancelled) setError(t('settings.errors.credentialsLoadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, t]);

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
      setHasSecret(false);
    } catch {
      setError(t('settings.errors.credentialsDeleteFailed'));
    }
  }

  return { form, setForm, hasSecret, loading, saving, error, save, remove };
}
