import type { EvidenceRunDetails } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';
import styles from './RunOutcome.module.scss';

/** Failure summary and generated artifacts of a run; renders nothing when it has neither. */
export function RunOutcome({ details }: { details: EvidenceRunDetails }) {
  const { t } = useTranslation('evidence');
  if (!details.failureSummary && details.artifacts.length === 0) return null;
  return (
    <section className={styles.outcome}>
      {details.failureSummary && (
        <div className={styles.failure} role="alert">
          <h3>{t('failure.title')}</h3>
          <p>{details.failureSummary}</p>
        </div>
      )}
      {details.artifacts.length > 0 && (
        <div>
          <h3>{t('artifacts.title')}</h3>
          <ul className={styles.artifacts}>
            {details.artifacts.map((artifact) => (
              <li key={artifact}>
                <code>{artifact}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
