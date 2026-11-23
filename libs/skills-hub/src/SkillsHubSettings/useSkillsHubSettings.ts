import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@openjcockpit/i18n';
import {
  createSkillsMarketplace,
  deleteSkillsMarketplace,
  listSkillsMarketplaces,
  updateSkillsMarketplace,
} from '@openjcockpit/api';
import { MARKETPLACES_KEY } from '../contributions/useConnectedMarketplaces';
import type {
  SkillsMarketplaceConnection,
  SkillsMarketplaceConnectionRequest,
} from '@openjcockpit/api';

export const EMPTY_MARKETPLACE_FORM: SkillsMarketplaceConnectionRequest = {
  name: '',
  marketplaceUrl: '',
  apiKey: '',
  description: '',
  enabled: true,
};

export function toMarketplaceForm(
  connection: SkillsMarketplaceConnection,
): SkillsMarketplaceConnectionRequest {
  return {
    name: connection.name,
    marketplaceUrl: connection.marketplaceUrl,
    apiKey: '',
    description: connection.description ?? '',
    enabled: connection.enabled,
  };
}

/** Marketplace connections list, form state and save / delete actions. */
export function useSkillsHubSettings() {
  const { t } = useTranslation('skillsHub');
  const queryClient = useQueryClient();
  const connectionsQuery = useQuery({
    queryKey: MARKETPLACES_KEY,
    queryFn: () => listSkillsMarketplaces(),
  });
  const connections = connectionsQuery.data ?? [];
  const loaded = !connectionsQuery.isPending;
  const [saving, setSaving] = useState(false);
  // `undefined` = not touched yet, so the load error (if any) is shown; `null` clears it.
  const [errorOverride, setError] = useState<string | null | undefined>(undefined);
  const loadError = connectionsQuery.error
    ? connectionsQuery.error instanceof Error
      ? connectionsQuery.error.message
      : t('settings.error.loadFailed')
    : null;
  const error = errorOverride === undefined ? loadError : errorOverride;
  const [status, setStatus] = useState('');

  function updateConnections(
    update: (prev: SkillsMarketplaceConnection[]) => SkillsMarketplaceConnection[],
  ) {
    queryClient.setQueryData<SkillsMarketplaceConnection[]>(MARKETPLACES_KEY, (prev) =>
      update(prev ?? []),
    );
  }

  function clearError() {
    setError(null);
  }

  /** Creates (`editingId` null) or updates a connection; resolves true when it was saved. */
  async function saveConnection(
    editingId: string | null,
    form: SkillsMarketplaceConnectionRequest,
  ): Promise<boolean> {
    if (!form.name.trim()) {
      setError(t('settings.error.nameRequired'));
      return false;
    }
    if (!form.marketplaceUrl.trim()) {
      setError(t('settings.error.urlRequired'));
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId === null) {
        const created = await createSkillsMarketplace(form);
        updateConnections((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setStatus(t('settings.status.added', { name: created.name }));
      } else {
        const updated = await updateSkillsMarketplace(editingId, form);
        updateConnections((prev) =>
          prev
            .map((c) => (c.id === editingId ? updated : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setStatus(t('settings.status.updated', { name: updated.name }));
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.error.saveFailed'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(connection: SkillsMarketplaceConnection) {
    setError(null);
    try {
      await deleteSkillsMarketplace(connection.id);
      updateConnections((prev) => prev.filter((c) => c.id !== connection.id));
      setStatus(t('settings.status.deleted', { name: connection.name }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.error.deleteFailed'));
    }
  }

  return {
    connections,
    loaded,
    saving,
    error,
    status,
    clearError,
    saveConnection,
    handleDelete,
  };
}
