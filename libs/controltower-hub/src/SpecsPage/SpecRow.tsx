import { useNavigate } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import { Icon, ListRow, StatusChip } from '@openjcockpit/ui';
import type { ControlTowerSpec } from '@openjcockpit/api';
import { specPath } from '../routePaths';
import { STATUS_KIND } from './statusKind';
import styles from './SpecsPage.module.scss';

/** One specification in the registry list; picking it opens its detail screen. */
export function SpecRow({ spec }: { spec: ControlTowerSpec }) {
  const { t } = useTranslation('controltower');
  const navigate = useNavigate();
  return (
    <ListRow>
      <button
        type="button"
        className={styles.rowButton}
        onClick={() => void navigate(specPath(spec.id))}
      >
        <span>
          <b>{spec.title}</b>
          <small>
            {spec.id} · <code>{`specs/${spec.specPath}`}</code>
            {spec.branch && ` · ${t('specs.branch', { branch: spec.branch })}`}
          </small>
        </span>
        <StatusChip label={t(`specs.status.${spec.status}`)} kind={STATUS_KIND[spec.status]} />
        <Icon name="arrow-right" />
      </button>
    </ListRow>
  );
}
