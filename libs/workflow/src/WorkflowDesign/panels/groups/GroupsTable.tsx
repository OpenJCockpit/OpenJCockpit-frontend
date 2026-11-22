import type { WorkflowGroup } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { Actions, DataTable, IconButton, HiddenHeader } from '@openjcockpit/ui';

interface GroupsTableProps {
  items: WorkflowGroup[];
  onEdit: (item: WorkflowGroup) => void;
  onDelete: (item: WorkflowGroup) => void;
}

export function GroupsTable({ items, onEdit, onDelete }: GroupsTableProps) {
  const { t } = useTranslation('workflow');
  return (
    <DataTable>
      <thead>
        <tr>
          <th>ID</th>
          <th>{t('shared.name')}</th>
          <th>{t('shared.project')}</th>
          <th>{t('shared.description')}</th>
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
            <td>{item.projectName || t('groups.global')}</td>
            <td>{item.description}</td>
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
