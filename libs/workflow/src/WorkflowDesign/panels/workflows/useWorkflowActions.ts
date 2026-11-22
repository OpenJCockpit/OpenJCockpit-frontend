import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@openjcockpit/i18n';
import {
  createWorkflow,
  deleteWorkflow,
  exportWorkflows,
  importWorkflows,
  logger,
  updateWorkflow,
} from '@openjcockpit/api';
import type { WorkflowDefinition, WorkflowExportBundle, WorkflowOrb } from '@openjcockpit/api';
import { readFileText, downloadWorkflowBundle } from '../../utils';
import type { WorkflowDraft } from './WorkflowEditor/OrbEditor';
import { workflowGroupsQueryKey, workflowsQueryKey } from './useWorkflowsPanelData';

/**
 * Save, delete, export and import for the workflows panel, plus the messages they produce.
 * `closeEditor` is called after a successful save.
 */
export function useWorkflowActions(form: WorkflowDraft, closeEditor: () => void) {
  const { t } = useTranslation('workflow');
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [orbError, setOrbError] = useState<string | null>(null);
  const [importViolations, setImportViolations] = useState<string[]>([]);

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  function updateItems(update: (prev: WorkflowDefinition[]) => WorkflowDefinition[]) {
    queryClient.setQueryData<WorkflowDefinition[]>(
      workflowsQueryKey,
      (prev) => prev && update(prev),
    );
  }

  async function handleSave(editingId: string) {
    if (!form.groupId && !form.projectName.trim()) {
      setError(t('workflows.groupOrProjectRequired'));
      return;
    }
    if (form.agentIds.length === 0) {
      setError(t('workflows.agentRequired'));
      return;
    }
    setOrbError(null);
    const orbs: WorkflowOrb[] = [];
    for (const [index, { mode, ...orb }] of (form.workflowOrbs ?? []).entries()) {
      if (!mode) {
        setOrbError(t('workflows.orbModeRequired', { index: index + 1 }));
        return;
      }
      orbs.push({ ...orb, mode });
    }
    setSaving(true);
    setError(null);
    try {
      const request: WorkflowDefinition = {
        ...form,
        workflowOrbs: form.workflowOrbs && orbs,
        groupId: form.groupId || undefined,
      };
      const saved =
        editingId === 'new'
          ? await createWorkflow(request)
          : await updateWorkflow(editingId, request);
      updateItems((prev) =>
        editingId === 'new' ? [...prev, saved] : prev.map((i) => (i.id === saved.id ? saved : i)),
      );
      closeEditor();
    } catch (err) {
      setOrbError(null);
      // Surfaces the server's actual message (e.g. the approval-gate placement validation
      // naming the offending stage) instead of a generic failure (AC-03).
      setError(err instanceof Error ? err.message : t('workflows.saveFailed'));
      logger.warn(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWorkflow(id);
      updateItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('workflows.deleteFailed'));
      logger.warn(err);
    }
  }

  async function handleExport() {
    setError(null);
    setInfo(null);
    try {
      downloadWorkflowBundle(await exportWorkflows());
    } catch (err) {
      setError(t('workflows.exportFailed'));
      logger.warn(err);
    }
  }

  async function handleImportFile(file: File) {
    setError(null);
    setInfo(null);
    setImportViolations([]);
    try {
      const bundle = JSON.parse(await readFileText(file)) as WorkflowExportBundle;
      const result = await importWorkflows(bundle);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workflowsQueryKey }),
        queryClient.invalidateQueries({ queryKey: workflowGroupsQueryKey }),
      ]);
      setInfo(
        t('workflows.imported', {
          workflows: result.workflowsImported,
          groups: result.groupsImported,
        }),
      );
      setImportViolations(result.violations ?? []);
    } catch (err) {
      setError(t('workflows.importFailed'));
      logger.warn(err);
    }
  }

  return {
    saving,
    error,
    info,
    orbError,
    importViolations,
    clearMessages,
    handleSave,
    handleDelete,
    handleExport,
    handleImportFile,
  };
}
