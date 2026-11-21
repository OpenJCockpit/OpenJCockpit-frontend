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

/** The spec lifecycle as a stage strip (Draft -> Approved -> Dispatched -> Done) that filters by stage, plus a title/ID search. The parent keeps the state in the URL. */
export function SpecFilterBar({ specs, filter, onChange }: Props) {
  const { t } = useTranslation('controltower');
  const counts = countByStatus(specs);
  return (
    <div className={styles.filterBar}>
      <div role="group" aria-label={t('specs.filterLabel')} className={styles.stageStrip}>
        <Button
          variant={filter.status === null ? 'primary' : 'secondary'}
          aria-pressed={filter.status === null}
          onClick={() => onChange({ ...filter, status: null })}
        >
          {t('specs.filterAll')} ({specs.length})
        </Button>
        <ol className={styles.stages}>
          {SPEC_STATUSES.map((status) => (
            <li key={status}>
              <Button
                variant={filter.status === status ? 'primary' : 'secondary'}
                aria-pressed={filter.status === status}
                onClick={() => onChange({ ...filter, status })}
              >
                {t(`specs.status.${status}`)} ({counts[status]})
              </Button>
            </li>
          ))}
        </ol>
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
