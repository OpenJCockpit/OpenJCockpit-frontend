import type { WorkflowDefinition } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { Actions, DataTable, IconButton, HiddenHeader } from '@openjcockpit/ui';

interface WorkflowsTableProps {
  items: WorkflowDefinition[];
  groupName: (groupId?: string) => string;
  onEdit: (item: WorkflowDefinition) => void;
  onDelete: (item: WorkflowDefinition) => void;
}

export function WorkflowsTable({ items, groupName, onEdit, onDelete }: WorkflowsTableProps) {
  const { t } = useTranslation('workflow');
  return (
    <DataTable>
      <thead>
        <tr>
          <th>ID</th>
          <th>{t('shared.name')}</th>
          <th>{t('shared.project')}</th>
          <th>{t('shared.group')}</th>
          <th>{t('shared.status')}</th>
          <th>
            <HiddenHeader>{t('shared.actions')}</HiddenHeader>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.name}</td>
            <td>{item.projectName}</td>
            <td>{groupName(item.groupId)}</td>
            <td>{item.status}</td>
            <td>
              <Actions>
                <IconButton icon="edit" label={t('shared.edit')} onClick={() => onEdit(item)} />
                <IconButton
                  icon="delete"
                  variant="danger"
                  label={t('shared.delete')}
                  onClick={() => onDelete(item)}
                />
              </Actions>
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
