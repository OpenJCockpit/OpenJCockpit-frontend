import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import {
  ActionRow,
  Icon,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Skeleton,
  TwoColumn,
  buttonClass,
  cx,
} from '@openjcockpit/ui';
import { useControlTowerCounts, useInterviews, useQueueProposal, useSpecs } from '../hooks';
import { useRepository } from '../RepositoryGate/RepositoryGate';
import {
  CONTROLTOWER_INTERVIEWS_PATH,
  CONTROLTOWER_QUEUE_PATH,
  CONTROLTOWER_REPOSITORY_SETTINGS_PATH,
  CONTROLTOWER_SPECS_PATH,
  CONTROLTOWER_TEMPLATES_PATH,
} from '../routePaths';
import styles from './OverviewPage.module.scss';

type Counts = ReturnType<typeof useControlTowerCounts>;
type Step = 'repository' | 'templates' | 'interview' | 'specs' | 'dispatch';

const STEP_PATHS: Record<Step, string> = {
  repository: CONTROLTOWER_REPOSITORY_SETTINGS_PATH,
  templates: CONTROLTOWER_TEMPLATES_PATH,
  interview: CONTROLTOWER_INTERVIEWS_PATH,
  specs: CONTROLTOWER_SPECS_PATH,
  dispatch: CONTROLTOWER_QUEUE_PATH,
};

/** `undefined` while the data is still loading, so a step is neither done nor the next one to do. */
function stepsDone(counts: Counts): Record<Step, boolean | undefined> {
  const { approved, dispatched, done } = counts;
  const progressed =
    approved === undefined ? undefined : approved + (dispatched ?? 0) + (done ?? 0);
  return {
    repository: true,
    templates: counts.templates === undefined ? undefined : counts.templates > 0,
    interview: counts.interviews === undefined ? undefined : counts.interviews > 0,
    specs: progressed === undefined ? undefined : progressed > 0,
    dispatch: dispatched === undefined || done === undefined ? undefined : dispatched + done > 0,
  };
}

/** The most useful next move: set up, discover, review drafts, dispatch. Falls back to discovery. */
function useNextAction(counts: Counts): { to: string; label: string } {
  const { t } = useTranslation('controltower');
  const { templates, drafts, approved, dispatched, done, ready } = counts;
  if (templates === 0) {
    return { to: CONTROLTOWER_TEMPLATES_PATH, label: t('overview.ctaTemplates') };
  }
  const specs = [drafts, approved, dispatched, done].every((n) => n !== undefined)
    ? (drafts ?? 0) + (approved ?? 0) + (dispatched ?? 0) + (done ?? 0)
    : undefined;
  if (specs === 0) return { to: CONTROLTOWER_INTERVIEWS_PATH, label: t('overview.start') };
  if (drafts) {
    return {
      to: CONTROLTOWER_SPECS_PATH,
      label: t('overview.ctaReview', { count: drafts }),
    };
  }
  if (ready) return { to: CONTROLTOWER_QUEUE_PATH, label: t('overview.ctaDispatch') };
  return { to: CONTROLTOWER_INTERVIEWS_PATH, label: t('overview.start') };
}

interface StatProps {
  label: string;
  to: string;
  value: number | undefined;
  failed: boolean;
}

/** A counter that links to the page behind it: a skeleton while loading, a dash when the load failed. */
function Stat({ label, to, value, failed }: StatProps) {
  const { t } = useTranslation('controltower');
  let shown: ReactNode = <Skeleton width="2ch" height="1.2em" />;
  if (value !== undefined) shown = value;
  else if (failed) shown = t('notAvailable');
  return (
    <Panel className={styles.stat}>
      <Link to={to} className={styles.statLink}>
        <span>{label}</span>
        <strong>{shown}</strong>
      </Link>
    </Panel>
  );
}

/** Counts for the linked repository and the guided workflow. */
export function OverviewPage() {
  const { t } = useTranslation('controltower');
  const repository = useRepository();
  const counts = useControlTowerCounts(repository.id);
  const specs = useSpecs(repository.id);
  const interviews = useInterviews(repository.id);
  const queue = useQueueProposal(repository.id);
  const done = stepsDone(counts);
  const steps = Object.keys(STEP_PATHS) as Step[];
  const current = steps.find((step) => done[step] === false);
  const next = useNextAction(counts);
  const specCount = specs.data?.length;

  return (
    <>
      <div className={styles.stats}>
        <Panel className={styles.stat}>
          <span>{t('overview.repository')}</span>
          <strong>{repository.name}</strong>
        </Panel>
        <Stat
          label={t('overview.interviews')}
          to={CONTROLTOWER_INTERVIEWS_PATH}
          value={counts.interviews}
          failed={interviews.isError}
        />
        <Stat
          label={t('overview.specs')}
          to={CONTROLTOWER_SPECS_PATH}
          value={specCount}
          failed={specs.isError}
        />
        <Stat
          label={t('overview.ready')}
          to={CONTROLTOWER_QUEUE_PATH}
          value={counts.ready}
          failed={queue.isError}
        />
      </div>
      <TwoColumn>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('overview.howTitle')}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <ol className={styles.steps}>
              {steps.map((step) => (
                <li key={step} className={step === current ? styles.stepCurrent : undefined}>
                  <span
                    className={cx(styles.stepMark, done[step] && styles.stepDone)}
                    aria-hidden="true"
                  >
                    {done[step] ? <Icon name="check" /> : null}
                  </span>
                  <Link to={STEP_PATHS[step]} aria-current={step === current ? 'step' : undefined}>
                    {t(`overview.steps.${step}`)}
                  </Link>
                  {done[step] && (
                    <span className={styles.visuallyHidden}>{t('overview.stepDone')}</span>
                  )}
                </li>
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
              <Link className={buttonClass({ variant: 'primary' })} to={next.to}>
                {next.label}
              </Link>
            </ActionRow>
          </PanelBody>
        </Panel>
      </TwoColumn>
    </>
  );
}
