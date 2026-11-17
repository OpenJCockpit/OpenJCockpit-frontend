import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  TwoColumn,
  buttonClass,
} from '@openjcockpit/ui';
import { useInterviews, useQueueProposal, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import { CONTROLTOWER_INTERVIEWS_PATH } from '../routePaths';
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
      <TwoColumn>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('overview.howTitle')}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <ol className={styles.steps}>
              {STEPS.map((step) => (
                <li key={step}>{t(`overview.steps.${step}`)}</li>
              ))}
            </ol>
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('overview.ideasTitle')}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <p>{t('overview.ideasText')}</p>
            <ActionRow>
              <Link
                className={buttonClass({ variant: 'primary' })}
                to={CONTROLTOWER_INTERVIEWS_PATH}
              >
                {t('overview.start')}
              </Link>
            </ActionRow>
          </PanelBody>
        </Panel>
      </TwoColumn>
    </>
  );
}
