import { useTranslation } from '@openjcockpit/i18n';
import { Button, TextField } from '@openjcockpit/ui';
import type { ControlTowerSpec } from '@openjcockpit/api';
import { countByStatus, SPEC_STATUSES, type SpecFilter } from './specFilter';
import styles from './SpecsPage.module.scss';

interface Props {
  specs: ControlTowerSpec[];
  filter: SpecFilter;
  onChange: (filter: SpecFilter) => void;
}

/** Status buttons with counts and a title/ID search. The parent keeps the state in the URL. */
export function SpecFilterBar({ specs, filter, onChange }: Props) {
  const { t } = useTranslation('controltower');
  const counts = countByStatus(specs);
  const options = [
    { status: null, label: t('specs.filterAll'), count: specs.length },
    ...SPEC_STATUSES.map((status) => ({
      status,
      label: t(`specs.status.${status}`),
      count: counts[status],
    })),
  ];
  return (
    <div className={styles.filterBar}>
      <div role="group" aria-label={t('specs.filterLabel')} className={styles.statusFilter}>
        {options.map((o) => (
          <Button
            key={o.status ?? 'ALL'}
            variant={filter.status === o.status ? 'primary' : 'secondary'}
            aria-pressed={filter.status === o.status}
            onClick={() => onChange({ ...filter, status: o.status })}
          >
            {o.label} ({o.count})
          </Button>
        ))}
      </div>
      <TextField
        label={t('specs.search')}
        type="search"
        value={filter.query}
        onChange={(query) => onChange({ ...filter, query })}
      />
    </div>
  );
}
