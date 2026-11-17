import { useTranslation } from '@openjcockpit/i18n';
import { ActionRow, Button, StatusChip, type StatusKind } from '@openjcockpit/ui';
import type { ControlTowerSpec, ControlTowerSpecStatus } from '@openjcockpit/api';
import { useWriteAccess } from '../useWriteAccess';
import styles from './SpecsPage.module.scss';

const STATUS_KIND: Record<ControlTowerSpecStatus, StatusKind> = {
  DRAFT: 'open',
  APPROVED: 'review',
  DISPATCHED: 'active',
  DONE: 'done',
};

interface Props {
  spec: ControlTowerSpec;
  completing: boolean;
  onApprove: (spec: ControlTowerSpec) => void;
  onComplete: (spec: ControlTowerSpec) => void;
}

/** One specification: summary line, dependencies, body and the actions its status allows. */
export function SpecRow({ spec, completing, onApprove, onComplete }: Props) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  return (
    <details className={styles.spec}>
      <summary>
        <div>
          <b>{spec.title}</b>
          <small>
            {[
              `${spec.id} · specs/${spec.specPath}`,
              spec.branch && t('specs.branch', { branch: spec.branch }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </small>
        </div>
        <StatusChip label={t(`specs.status.${spec.status}`)} kind={STATUS_KIND[spec.status]} />
      </summary>
      <div className={styles.specDetails}>
        <p>
          {t('specs.dependencies', {
            list: spec.dependsOn.join(', ') || t('specs.noDependencies'),
          })}
        </p>
        <pre>{spec.body}</pre>
        {canWrite && (
          <ActionRow>
            {spec.status === 'DRAFT' && (
              <Button variant="primary" onClick={() => onApprove(spec)}>
                {t('specs.approveAndPush')}
              </Button>
            )}
            {spec.status === 'DISPATCHED' && (
              <Button variant="secondary" disabled={completing} onClick={() => onComplete(spec)}>
                {t('specs.confirmDone')}
              </Button>
            )}
          </ActionRow>
        )}
      </div>
    </details>
  );
}
