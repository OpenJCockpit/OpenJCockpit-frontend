import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@openjcockpit/i18n';
import {
  createA2AService,
  deleteA2AService,
  listA2AServices,
  updateA2AService,
} from '@openjcockpit/api';
import type { A2AService, A2AServiceRequest } from '@openjcockpit/api';

export interface A2AServiceFormState {
  id: string;
  name: string;
  baseUrl: string;
  publicUrl: string;
  apiKey: string;
  callerTokenUrl: string;
  callerClientId: string;
  callerClientSecret: string;
}

export const EMPTY_A2A_FORM: A2AServiceFormState = {
  id: '',
  name: '',
  baseUrl: '',
  publicUrl: '',
  apiKey: '',
  callerTokenUrl: '',
  callerClientId: '',
  callerClientSecret: '',
};

const A2A_SERVICES_KEY = ['a2a-services'];
const NO_SERVICES: A2AService[] = [];

export function toA2AFormState(service: A2AService): A2AServiceFormState {
  return {
    id: service.id,
    name: service.name,
    baseUrl: service.baseUrl ?? '',
    publicUrl: service.publicUrl ?? '',
    apiKey: '',
    callerTokenUrl: service.callerTokenUrl ?? '',
    callerClientId: service.callerClientId ?? '',
    callerClientSecret: '',
  };
}

/** Data, form state and actions for the A2A services settings. */
export function useA2AServices() {
  const { t } = useTranslation('workflow');
  const queryClient = useQueryClient();
  const servicesQuery = useQuery({
    queryKey: A2A_SERVICES_KEY,
    queryFn: async () => (await listA2AServices()) ?? [],
  });
  const services = servicesQuery.data ?? NO_SERVICES;
  const loaded = !servicesQuery.isPending;
  const setServices = (update: (prev: A2AService[]) => A2AService[]) =>
    queryClient.setQueryData<A2AService[]>(A2A_SERVICES_KEY, (prev) => prev && update(prev));
  const [saving, setSaving] = useState(false);
  // undefined until an action sets or clears it; then the load failure (if any) is shown instead.
  const [actionError, setError] = useState<string | null | undefined>(undefined);
  const loadError = servicesQuery.error
    ? servicesQuery.error instanceof Error
      ? servicesQuery.error.message
      : t('a2aServices.loadFailed')
    : null;
  const error = actionError === undefined ? loadError : actionError;
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (request: Parameters<typeof createA2AService>[0]) => createA2AService(request),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: A2AServiceRequest }) =>
      updateA2AService(id, request),
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteA2AService(id) });

  function clearFeedback() {
    setError(null);
    setSavedMessage(null);
  }

  /** Creates (`editingId` null) or updates a service; resolves true when it was saved. */
  async function saveService(
    editingId: string | null,
    form: A2AServiceFormState,
  ): Promise<boolean> {
    const fail = (message: string) => {
      setError(message);
      return false;
    };
    if (editingId === null && !form.id.trim()) return fail(t('a2aServices.error.idRequired'));
    if (!form.name.trim()) return fail(t('a2aServices.error.nameRequired'));
    if (!form.baseUrl.trim()) return fail(t('a2aServices.error.baseUrlRequired'));
    if (editingId === null && !form.apiKey.trim()) {
      return fail(t('a2aServices.error.apiKeyRequired'));
    }
    setSaving(true);
    clearFeedback();
    const request = {
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      publicUrl: form.publicUrl.trim() || undefined,
      apiKey: form.apiKey || undefined,
      callerTokenUrl: form.callerTokenUrl.trim() || undefined,
      callerClientId: form.callerClientId.trim() || undefined,
      callerClientSecret: form.callerClientSecret || undefined,
    };
    try {
      if (editingId === null) {
        const created = await createMutation.mutateAsync({ id: form.id.trim(), ...request });
        setServices((prev) => [...prev, created]);
        setSavedMessage(t('a2aServices.added', { name: created.name }));
      } else {
        const updated = await updateMutation.mutateAsync({ id: editingId, request });
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setSavedMessage(t('a2aServices.updated', { name: updated.name }));
      }
      return true;
    } catch (err) {
      return fail(err instanceof Error ? err.message : t('a2aServices.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service: A2AService) {
    setError(null);
    setSavedMessage(null);
    try {
      await deleteMutation.mutateAsync(service.id);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      setSavedMessage(t('a2aServices.deleted', { name: service.name }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('a2aServices.deleteFailed'));
    }
  }

  return {
    services,
    loaded,
    error,
    savedMessage,
    saving,
    clearFeedback,
    saveService,
    handleDelete,
  };
}
