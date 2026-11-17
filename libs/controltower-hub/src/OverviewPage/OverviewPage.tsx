import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import { buttonClass, Panel, PanelHeader, PanelTitle } from '@openjcockpit/ui';
import { useInterviews, useQueueProposal, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { CONTROLTOWER_INTERVIEWS_PATH } from '../routePaths';
import common from '../shared.module.scss';
import styles from './OverviewPage.module.scss';

const STEPS = ['repository', 'templates', 'interview', 'specs', 'dispatch'] as const;

/** Counts for the linked repository and the guided workflow. */
export function OverviewPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const interviews = useInterviews(repository.id).data;
  const specs = useSpecs(repository.id).data;
  const queue = useQueueProposal(repository.id).data;
  const dash = t('notAvailable');

  return (
    <>
      <div className={styles.stats}>
        <Panel className={styles.stat}>
          <span>{t('overview.repository')}</span>
          <strong>{repository.name}</strong>
        </Panel>
        <Panel className={styles.stat}>
          <span>{t('overview.interviews')}</span>
          <strong>{interviews?.length ?? dash}</strong>
        </Panel>
        <Panel className={styles.stat}>
          <span>{t('overview.specs')}</span>
          <strong>{specs?.length ?? dash}</strong>
        </Panel>
        <Panel className={styles.stat}>
          <span>{t('overview.ready')}</span>
          <strong>{queue?.length ?? dash}</strong>
        </Panel>
      </div>
      <div className={common.twoCol}>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('overview.howTitle')}</PanelTitle>
          </PanelHeader>
          <div className={common.body}>
            <ol className={styles.steps}>
              {STEPS.map((step) => (
                <li key={step}>{t(`overview.steps.${step}`)}</li>
              ))}
            </ol>
          </div>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('overview.ideasTitle')}</PanelTitle>
          </PanelHeader>
          <div className={common.body}>
            <p>{t('overview.ideasText')}</p>
            <div className={common.actions}>
              <Link
                className={buttonClass({ variant: 'primary' })}
                to={CONTROLTOWER_INTERVIEWS_PATH}
              >
                {t('overview.start')}
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
