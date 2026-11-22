import type { SubagentSpec } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import { Actions, DataTable, IconButton, HiddenHeader } from '@openjcockpit/ui';

interface SubagentsTableProps {
  items: SubagentSpec[];
  onEdit: (item: SubagentSpec) => void;
  onDelete: (name: string) => void;
}

export function SubagentsTable({ items, onEdit, onDelete }: SubagentsTableProps) {
  const { t } = useTranslation('workflow');
  return (
    <DataTable>
      <thead>
        <tr>
          <th>{t('shared.name')}</th>
          <th>{t('subagents.parentAgent')}</th>
          <th>{t('shared.skills')}</th>
          <th>
            <HiddenHeader>{t('shared.actions')}</HiddenHeader>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.name}>
            <td>{item.name}</td>
            <td>{item.parentAgent}</td>
            <td>{item.skillNames.join(', ')}</td>
            <td>
              <Actions>
                <IconButton icon="edit" label={t('shared.edit')} onClick={() => onEdit(item)} />
                <IconButton
                  icon="delete"
                  variant="danger"
                  label={t('shared.delete')}
                  onClick={() => onDelete(item.name)}
                />
              </Actions>
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
