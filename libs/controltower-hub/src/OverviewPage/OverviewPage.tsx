import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '@openjcockpit/i18n';
import type { ControlTowerInterview } from '@openjcockpit/api';
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
  interviewPath,
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
  // All three come from the same specs query, so they load together.
  const progressed =
    approved === undefined ? undefined : approved + (dispatched as number) + (done as number);
  return {
    repository: true,
    templates: counts.templates === undefined ? undefined : counts.templates > 0,
    interview: counts.interviews === undefined ? undefined : counts.interviews > 0,
    specs: progressed === undefined ? undefined : progressed > 0,
    dispatch: dispatched === undefined || done === undefined ? undefined : dispatched + done > 0,
  };
}

type Stage = 'interviews' | 'drafts' | 'approved' | 'dispatched' | 'done';

const STAGE_PATHS: Record<Stage, string> = {
  interviews: CONTROLTOWER_INTERVIEWS_PATH,
  drafts: `${CONTROLTOWER_SPECS_PATH}?status=DRAFT`,
  approved: `${CONTROLTOWER_SPECS_PATH}?status=APPROVED`,
  dispatched: `${CONTROLTOWER_SPECS_PATH}?status=DISPATCHED`,
  done: `${CONTROLTOWER_SPECS_PATH}?status=DONE`,
};

/** Set up and under way: the checklist has told the user what it can, so the pipeline leads instead. */
function isEstablished(done: Record<Step, boolean | undefined>): boolean {
  return done.templates === true && done.interview === true && done.specs === true;
}

/** Where the work stands: each stage's count links to the matching list. */
function Pipeline({ counts }: { counts: Counts }) {
  const { t } = useTranslation('controltower');
  const stages = Object.keys(STAGE_PATHS) as Stage[];
  return (
    <ol className={styles.pipeline} aria-label={t('overview.pipelineLabel')}>
      {stages.map((stage) => (
        <li key={stage}>
          <Link to={STAGE_PATHS[stage]} className={styles.pipelineLink}>
            <span>{t(`overview.stages.${stage}`)}</span>
            <strong>{counts[stage]}</strong>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** The interview itself when exactly one matches, otherwise the list to pick from. */
function interviewTarget(interviews: readonly ControlTowerInterview[], status: string) {
  const matching = interviews.filter((i) => i.status === status);
  const [only, ...others] = matching;
  return only && others.length === 0 ? interviewPath(only.id) : CONTROLTOWER_INTERVIEWS_PATH;
}

/**
 * The most useful next move, in workflow order: a template, an interview to resume or turn into specs,
 * drafts to review, specs to dispatch, dispatched specs to confirm. Falls back to starting discovery.
 */
function useNextAction(
  counts: Counts,
  interviews: readonly ControlTowerInterview[] | undefined,
): { to: string; label: string } {
  const { t } = useTranslation('controltower');
  const { templates, activeInterviews, completeInterviews, drafts, dispatched, ready } = counts;
  if (templates === 0) {
    return { to: CONTROLTOWER_TEMPLATES_PATH, label: t('overview.ctaTemplates') };
  }
  if (activeInterviews) {
    return {
      to: interviewTarget(interviews as readonly ControlTowerInterview[], 'ACTIVE'),
      label: t('overview.ctaResume'),
    };
  }
  if (completeInterviews) {
    return {
      to: interviewTarget(interviews as readonly ControlTowerInterview[], 'COMPLETE'),
      label: t('overview.ctaGenerate'),
    };
  }
  if (drafts) {
    return { to: CONTROLTOWER_SPECS_PATH, label: t('overview.ctaReview', { count: drafts }) };
  }
  if (ready) return { to: CONTROLTOWER_QUEUE_PATH, label: t('overview.ctaDispatch') };
  if (dispatched) {
    return {
      to: `${CONTROLTOWER_SPECS_PATH}?status=DISPATCHED`,
      label: t('overview.ctaConfirm', { count: dispatched }),
    };
  }
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
  const next = useNextAction(counts, interviews.data);
  const specCount = specs.data?.length;
  const established = isEstablished(done);
  const checklist = (
    <ol className={styles.steps}>
      {steps.map((step) => (
        <li key={step} className={step === current ? styles.stepCurrent : undefined}>
          <span className={cx(styles.stepMark, done[step] && styles.stepDone)} aria-hidden="true">
            {done[step] ? <Icon name="check" /> : null}
          </span>
          <Link to={STEP_PATHS[step]} aria-current={step === current ? 'step' : undefined}>
            {t(`overview.steps.${step}`)}
          </Link>
          {done[step] && <span className={styles.visuallyHidden}>{t('overview.stepDone')}</span>}
        </li>
      ))}
    </ol>
  );

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
          label={t('overview.needsReview')}
          to={`${CONTROLTOWER_SPECS_PATH}?status=DRAFT`}
          value={counts.drafts}
          failed={specs.isError}
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
      {established && (
        <Panel className={styles.pipelinePanel}>
          <PanelHeader>
            <PanelTitle>{t('overview.pipelineTitle')}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <Pipeline counts={counts} />
          </PanelBody>
        </Panel>
      )}
      <TwoColumn>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('overview.howTitle')}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            {established ? (
              <details className={styles.gettingStarted}>
                <summary>{t('overview.gettingStarted')}</summary>
                {checklist}
              </details>
            ) : (
              checklist
            )}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('overview.ideasTitle')}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <p className={styles.intro}>{t('overview.ideasText')}</p>
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
