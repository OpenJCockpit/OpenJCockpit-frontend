import { useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import type { AgentDefinition, WorkflowDefinition, WorkflowGroup } from '@openjcockpit/api';
import {
  Button,
  StatusMessage,
  FileImportButton,
  fieldErrorClass,
  fieldHintClass,
  Select,
  cx,
  Icon,
} from '@openjcockpit/ui';
import { useConfirmDelete } from '../shared/useConfirmDelete';
import { WorkflowEditor } from './WorkflowEditor/WorkflowEditor';
import type { WorkflowDraft } from './WorkflowEditor/OrbEditor';
import { WorkflowsTable } from './WorkflowsTable';
import { useWorkflowActions } from './useWorkflowActions';
import { useWorkflowsPanelData } from './useWorkflowsPanelData';
import WorkflowDesignStyles from '../../WorkflowDesign.module.scss';

const EMPTY_WORKFLOW: WorkflowDraft = {
  id: '',
  name: '',
  projectName: '',
  groupId: '',
  description: '',
  agentIds: [],
  subagentNames: [],
  skillNames: [],
  mcpTools: [],
  trigger: { dashboardButtonEnabled: true, hermesSignalEnabled: false, fileDeliveryEnabled: false },
  execution: { customerId: '', repositoryUrl: '', timeoutSeconds: 600 },
  approvalGate: undefined,
  status: 'ACTIVE',
};

const NO_WORKFLOWS: WorkflowDefinition[] = [];
const NO_GROUPS: WorkflowGroup[] = [];
const NO_AGENTS: AgentDefinition[] = [];

export function WorkflowsPanel() {
  const { t } = useTranslation('workflow');
  const { askDelete, dialog } = useConfirmDelete();
  const data = useWorkflowsPanelData();
  const items = data.items ?? NO_WORKFLOWS;
  const groups = data.groups ?? NO_GROUPS;
  const availableAgents = data.availableAgents ?? NO_AGENTS;
  const { loaded, loadError: catalogueError } = data;
  const [groupFilter, setGroupFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkflowDraft>(EMPTY_WORKFLOW);
  const {
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
  } = useWorkflowActions(form, () => setEditingId(null));

  if (!loaded) {
    return <StatusMessage variant="loading">{t('workflows.loading')}</StatusMessage>;
  }

  function groupName(groupId?: string): string {
    if (!groupId) return '—';
    return groups.find((g) => g.id === groupId)?.name ?? groupId;
  }

  const visibleItems =
    groupFilter === 'all'
      ? items
      : groupFilter === 'none'
        ? items.filter((i) => !i.groupId)
        : items.filter((i) => i.groupId === groupFilter);

  function startCreate() {
    setEditingId('new');
    setForm(EMPTY_WORKFLOW);
    clearMessages();
  }
  function cancelEdit() {
    setEditingId(null);
  }
  function startEdit(item: WorkflowDefinition) {
    setEditingId(item.id);
    setForm(item);
    clearMessages();
  }

  return (
    <div>
      <div className={WorkflowDesignStyles.workflowDesignToolbar}>
        <Button variant="primary" onClick={startCreate}>
          {t('workflows.newButton')}
        </Button>
        <label className={WorkflowDesignStyles.workflowGroupFilter}>
          {t('workflows.group')}
          <Select
            className={WorkflowDesignStyles.workflowGroupFilterSelect}
            value={groupFilter}
            onChange={setGroupFilter}
            options={[
              { value: 'all', label: t('workflows.allGroups') },
              { value: 'none', label: t('workflows.noGroup') },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        </label>
        <div className={WorkflowDesignStyles.workflowDesignToolbarSpacer} />
        <Button variant="secondary" onClick={() => void handleExport()}>
          <Icon name="download" /> {t('workflows.export')}
        </Button>
        <FileImportButton
          accept="application/json,.json"
          inputLabel={t('workflows.importLabel')}
          onFile={(file) => void handleImportFile(file)}
        >
          <Icon name="upload" /> {t('workflows.import')}
        </FileImportButton>
      </div>
      <p className={fieldHintClass}>{t('workflows.intro')}</p>
      {error && (
        <p id="workflow-save-error" className={fieldErrorClass} role="alert">
          {error}
        </p>
      )}
      {info && <StatusMessage>{info}</StatusMessage>}
      {importViolations.length > 0 && (
        <div className={cx(fieldHintClass, 'workflow-import-violations')} role="status">
          <p>{t('workflows.unresolved', { count: importViolations.length })}</p>
          <ul>
            {importViolations.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        </div>
      )}

      {catalogueError && (
        <p className={fieldErrorClass} role="alert">
          {catalogueError}
        </p>
      )}
      {editingId && !catalogueError && (
        <WorkflowEditor
          isNew={editingId === 'new'}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={() => void handleSave(editingId)}
          onCancel={cancelEdit}
          groups={groups}
          items={items}
          availableAgents={availableAgents}
          orbError={orbError}
          saveError={error}
        />
      )}

      <WorkflowsTable
        items={visibleItems}
        groupName={groupName}
        onEdit={startEdit}
        onDelete={(item) => askDelete('workflow', item.name, () => handleDelete(item.id))}
      />
      {dialog}
    </div>
  );
}
