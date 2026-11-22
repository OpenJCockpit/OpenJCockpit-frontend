import { useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { isTerminalRunStatus, runStatusKind, runStatusLabel } from '@openjcockpit/api';
import type { WorkflowDefinition } from '@openjcockpit/api';
import { AgentSequencer } from '../AgentSequencer/AgentSequencer';
import { AgentLogConsole } from '../AgentLogConsole/AgentLogConsole';
import {
  EmptyState,
  StatusChip,
  Eyebrow,
  Panel,
  fieldHintClass,
  fieldErrorClass,
  cx,
  Button,
  Icon,
} from '@openjcockpit/ui';
import { ApprovalDecisionModal } from '../ApprovalDecisionModal/ApprovalDecisionModal';
import { WorkflowExecutionHistory } from '../WorkflowExecutionHistory/WorkflowExecutionHistory';
import { ArtifactList } from './ArtifactList';
import { RunLostPanel } from './RunLostPanel';
import { RunStatusAnnouncements } from './RunStatusAnnouncements';
import { useRunHistory } from './useRunHistory';
import { useRunActions } from './useRunActions';
import { useRunEvents } from './useRunEvents';
import { useRunView } from './useRunView';
import styles from './WorkflowExecution.module.scss';

// 'NOT_FOUND' is retained deliberately: it is what an OLDER backend (pre-dating this
// feature) returns for an unknown run id, so a newer dashboard paired with it still
// terminates instead of polling "waiting" forever (the exact bug this feature fixes
// for 'RUN_STATE_LOST'). Both are non-additive-safe, forward/backward tolerant.
const RUN_LOST_STATUSES = ['RUN_STATE_LOST', 'NOT_FOUND'];

interface Props {
  workflow: WorkflowDefinition | null;
  runId: string | null;
  onRunEnded?: () => void;
  /** Called when the operator asks to start the workflow again after its state was lost. */
  onRestartRequested?: () => void;
  showHistory?: boolean;
}

export function WorkflowExecution({
  workflow,
  runId,
  onRunEnded,
  onRestartRequested,
  showHistory = true,
}: Props) {
  const { t } = useTranslation('workflow');
  const { t: tApi } = useTranslation('api');
  // Container state: which run is currently selected (seeded from the runId prop when
  // a "just started" flow hands one in).
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runId);

  const {
    historyPage,
    historyLoading,
    historyError,
    historyPageRef,
    fetchHistory,
    refreshHistoryWindow,
    mergeHistoryItem,
    loadMore,
  } = useRunHistory(workflow, showHistory);

  const {
    latestEvents,
    runEvents,
    runStatus,
    setRunStatus,
    artifacts,
    failureSummary,
    approvalContext,
    setApprovalContext,
    approvalModalVisible,
    setApprovalModalVisible,
    decisionError,
    setDecisionError,
    approvalLoadError,
    waitingAnnouncement,
    setWaitingAnnouncement,
    previousWaitingStatus,
    setPreviousWaitingStatus,
  } = useRunEvents({
    workflow,
    selectedRunId,
    showHistory,
    historyPageRef,
    mergeHistoryItem,
    refreshHistoryWindow,
    onRunEnded,
  });

  // Keep selectedRunId in sync with a newly-provided runId prop (e.g. a fresh
  // "start workflow" flow), without clobbering a user's in-history selection when the
  // prop hasn't changed.
  const [prevRunId, setPrevRunId] = useState(runId);
  if (prevRunId !== runId) {
    setPrevRunId(runId);
    setSelectedRunId(runId);
  }

  const {
    definitions,
    sequencerNodes,
    activeAgent,
    logEvents,
    definitionFailureEvent,
    artifactLinks,
    latestChildWorkflowEvent,
    childRunId,
  } = useRunView({ workflow, latestEvents, runEvents, runStatus, artifacts });

  // Derived during render (not in an effect): announce only on entering/leaving the waiting state.
  if (previousWaitingStatus !== runStatus) {
    setPreviousWaitingStatus(runStatus);
    if (
      runStatus === 'AWAITING_CHILD_WORKFLOW' &&
      previousWaitingStatus !== 'AWAITING_CHILD_WORKFLOW'
    ) {
      setWaitingAnnouncement(
        latestChildWorkflowEvent
          ? `Waiting for child workflow: ${latestChildWorkflowEvent.title}`
          : 'Waiting for a triggered child workflow to complete.',
      );
    } else if (previousWaitingStatus === 'AWAITING_CHILD_WORKFLOW') {
      setWaitingAnnouncement('No longer waiting for the child workflow.');
    }
  }

  const { stopping, stopError, decisionSubmitting, handleStop, submitDecision } = useRunActions({
    selectedRunId,
    approvalContext,
    setRunStatus,
    setApprovalContext,
    setApprovalModalVisible,
    setDecisionError,
    onRunEnded,
  });

  const isRunLost = runStatus !== null && RUN_LOST_STATUSES.includes(runStatus);

  if (!workflow) {
    return (
      <EmptyState
        className={styles.workflowExecutionEmpty}
        title={t('workflowExecution.emptyTitle')}
        hint={t('workflowExecution.empty')}
      />
    );
  }

  return (
    <Panel className={styles.workflowExecutionPanel}>
      <header className={styles.workflowExecutionHeader}>
        <div>
          <Eyebrow>{workflow.id}</Eyebrow>
          <h2>{workflow.name}</h2>
        </div>
        <div className={styles.workflowExecutionActions}>
          {runStatus && (
            <StatusChip label={runStatusLabel(runStatus, tApi)} kind={runStatusKind(runStatus)} />
          )}
          {selectedRunId && !isTerminalRunStatus(runStatus ?? '') && (
            <Button variant="danger" onClick={() => handleStop(selectedRunId)} disabled={stopping}>
              {stopping ? (
                t('workflowExecution.stopping')
              ) : (
                <>
                  <Icon name="stop" /> {t('workflowExecution.stop')}
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {showHistory && (
        <WorkflowExecutionHistory
          className={styles.workflowExecutionHistorySlot}
          page={historyPage}
          loading={historyLoading}
          error={historyError}
          selectedRunId={selectedRunId}
          onSelect={(runId) => setSelectedRunId(runId)}
          onRetry={() => void fetchHistory(workflow.id)}
          onLoadMore={() => void loadMore()}
        />
      )}

      {!selectedRunId && (
        <p className={cx(fieldHintClass, styles.workflowExecutionEmpty)}>
          {t('workflowExecution.noRun')}
        </p>
      )}

      {selectedRunId && isRunLost && <RunLostPanel onRestartRequested={onRestartRequested} />}

      {selectedRunId && !isRunLost && <ArtifactList entries={artifactLinks} />}

      {selectedRunId && !isRunLost && latestChildWorkflowEvent && childRunId && (
        <p className="workflow-child-info">
          {latestChildWorkflowEvent.title}
          {' — '}
          {t('workflowExecution.childRun')} <code>{childRunId}</code>
        </p>
      )}

      <RunStatusAnnouncements
        messages={[waitingAnnouncement, definitionFailureEvent?.title, failureSummary]}
      />

      {stopError && (
        <p className={fieldErrorClass} role="alert">
          {stopError}
        </p>
      )}

      {approvalLoadError && (
        <p className={fieldErrorClass} role="alert">
          {approvalLoadError}
        </p>
      )}

      {selectedRunId &&
        runStatus === 'AWAITING_APPROVAL' &&
        approvalContext &&
        !approvalModalVisible && (
          <Button variant="workflow" onClick={() => setApprovalModalVisible(true)}>
            {t('workflowExecution.reviewApproval')}
          </Button>
        )}

      {selectedRunId && !isRunLost && (
        <AgentSequencer
          nodes={sequencerNodes}
          definitions={definitions}
          latestEvents={latestEvents}
        />
      )}

      {selectedRunId && !isRunLost && (
        <AgentLogConsole
          events={logEvents}
          agentName={activeAgent?.name ?? null}
          isActive={Boolean(activeAgent)}
        />
      )}

      {selectedRunId &&
        runStatus === 'AWAITING_APPROVAL' &&
        approvalContext &&
        approvalModalVisible && (
          <ApprovalDecisionModal
            context={approvalContext}
            submitting={decisionSubmitting}
            errorMessage={decisionError}
            onAccept={() => void submitDecision('ACCEPT')}
            onDeny={() => void submitDecision('DENY')}
            onAcceptWithComments={(comment) => void submitDecision('ACCEPT_WITH_COMMENTS', comment)}
            onDismiss={() => setApprovalModalVisible(false)}
          />
        )}
    </Panel>
  );
}
