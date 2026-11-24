import { useTranslation } from '@openjcockpit/i18n';
import { CheckboxField, Select } from '@openjcockpit/ui';
import { SOURCES, STATUSES, type EventFilter } from '../eventFilter';
import styles from './EvidenceFilters.module.scss';

interface Props {
  filter: EventFilter;
  onChange: (filter: EventFilter) => void;
}

/** Source and status filters for the timeline, plus a "failed only" shortcut. */
export function EvidenceFilters({ filter, onChange }: Props) {
  const { t } = useTranslation('evidence');
  return (
    <div className={styles.filters} role="group" aria-label={t('filters.title')}>
      <Select
        label={t('filters.source')}
        value={filter.source}
        options={[
          { value: 'all', label: t('filters.allSources') },
          ...SOURCES.map((value) => ({ value, label: t(`source.${value}`) })),
        ]}
        onChange={(source) => onChange({ ...filter, source: source as EventFilter['source'] })}
        data-testid="evidence-filter-source"
      />
      <Select
        label={t('filters.status')}
        value={filter.failedOnly ? 'failed' : filter.status}
        disabled={filter.failedOnly}
        options={[
          { value: 'all', label: t('filters.allStatuses') },
          ...STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
        ]}
        onChange={(status) => onChange({ ...filter, status: status as EventFilter['status'] })}
        data-testid="evidence-filter-status"
      />
      <CheckboxField
        label={t('filters.failedOnly')}
        checked={filter.failedOnly}
        onChange={(failedOnly) => onChange({ ...filter, failedOnly })}
      />
    </div>
  );
}
