import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import { ActionRow, Button, StatusChip, type StatusKind } from '@openjcockpit/ui';
import type { ControlTowerSpec, ControlTowerSpecStatus } from '@openjcockpit/api';
import { useWriteAccess } from '../useWriteAccess';
import { CopyButton } from './CopyButton';
import styles from './SpecsPage.module.scss';

const STATUS_KIND: Record<ControlTowerSpecStatus, StatusKind> = {
  DRAFT: 'open',
  APPROVED: 'review',
  DISPATCHED: 'active',
  DONE: 'done',
};

interface Props {
  spec: ControlTowerSpec;
  /** Titles by spec ID, to name the dependencies. */
  titles: ReadonlyMap<string, string>;
  /** IDs of the specs that list this one as a dependency. */
  blocks: readonly string[];
  /** Open and scroll into view, because a link pointed here. */
  focused: boolean;
  completing: boolean;
  onApprove: (spec: ControlTowerSpec) => void;
  onComplete: (spec: ControlTowerSpec) => void;
}

/** One specification: summary line, dependencies, body and the actions its status allows. */
export function SpecRow({
  spec,
  titles,
  blocks,
  focused,
  completing,
  onApprove,
  onComplete,
}: Props) {
  const { t } = useTranslation('controltower');
  const canWrite = useWriteAccess();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.open = true;
    ref.current.scrollIntoView?.({ block: 'center' });
  }, [focused]);

  const specLinks = (ids: readonly string[]) =>
    ids.map((id, i) => (
      <span key={id}>
        {i > 0 && ', '}
        {titles.has(id) ? (
          <Link to={{ search: `?focus=${encodeURIComponent(id)}` }} title={titles.get(id)}>
            {id}
          </Link>
        ) : (
          id
        )}
      </span>
    ));

  return (
    <details ref={ref} id={`spec-${spec.id}`} className={styles.spec}>
      <summary>
        <div>
          <b>{spec.title}</b>
          <small>
            {spec.id} · <code>{`specs/${spec.specPath}`}</code>
            {spec.branch && ` · ${t('specs.branch', { branch: spec.branch })}`}
          </small>
        </div>
        <StatusChip label={t(`specs.status.${spec.status}`)} kind={STATUS_KIND[spec.status]} />
      </summary>
      <div className={styles.specDetails}>
        <p>
          {t('specs.dependencies')}{' '}
          {spec.dependsOn.length ? specLinks(spec.dependsOn) : t('specs.noDependencies')}
        </p>
        {blocks.length > 0 && (
          <p>
            {t('specs.blocks')} {specLinks(blocks)}
          </p>
        )}
        <ActionRow>
          {spec.branch && <CopyButton text={spec.branch} label={t('specs.copyBranch')} />}
          <CopyButton text={spec.body} label={t('specs.copyBody')} />
        </ActionRow>
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
