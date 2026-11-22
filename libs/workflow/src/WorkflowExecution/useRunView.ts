import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@openjcockpit/i18n';
import { buildAgentCards, buildSequencerNodes, listWorkflows, queryKeys } from '@openjcockpit/api';
import type { AgentDefinition, AgentEvent, WorkflowDefinition } from '@openjcockpit/api';
import { loadLinkableAgents } from '../linkableAgents';
import { parseArtifactLinks } from './ArtifactList';

const NO_DEFINITIONS: AgentDefinition[] = [];
const NO_WORKFLOWS: WorkflowDefinition[] = [];

// Cross-tier constant: mirrors EmbabelOrchestrator.WORKFLOW_DEFINITION_AGENT_ID on the backend,
// and the existing 'workflow-orb' agentId convention already used in this file. A
// workflow-definition read failure is never attributable to one pipeline agent, so its events
// must stay visible in the log console even while another agent is actively RUNNING (BR-11/AC-08).
// Scoped to exactly this one agentId — do NOT broaden this to "any FAILED event", which would
// also un-hide unrelated existing events (e.g. an agentId: 'git' publication-failure event) whose
// visibility nobody asked to change.
const DEFINITION_FAILURE_AGENT_ID = 'workflow-definition';

interface Options {
  workflow: WorkflowDefinition | null;
  latestEvents: Record<string, AgentEvent>;
  runEvents: AgentEvent[];
  runStatus: string | null;
  artifacts: string[];
}

/** Everything the execution view derives from the selected run's raw events: agent cards, sequencer nodes, log filter, artifact links and the child-workflow link. */
export function useRunView({ workflow, latestEvents, runEvents, runStatus, artifacts }: Options) {
  const { t: tApi } = useTranslation('api');

  const { data: definitions = NO_DEFINITIONS } = useQuery({
    queryKey: queryKeys.linkableAgents,
    queryFn: loadLinkableAgents, // never rejects: a failed catalog degrades to []
  });

  // display-name lookup only (workflowNameById); [] degrades an orb label to its raw id, no functional loss
  const { data: allWorkflows = NO_WORKFLOWS } = useQuery({
    queryKey: queryKeys.workflows,
    queryFn: ({ signal }) => listWorkflows(signal),
  });

  const agentCards = useMemo(
    () => buildAgentCards(workflow, definitions, latestEvents, tApi),
    [workflow, definitions, latestEvents, tApi],
  );

  const workflowNameById = useMemo(
    () => new Map(allWorkflows.map((w) => [w.id, w.name])),
    [allWorkflows],
  );

  const sequencerNodes = useMemo(
    () => buildSequencerNodes(workflow, agentCards, runEvents, runStatus, workflowNameById, tApi),
    [workflow, agentCards, runEvents, runStatus, workflowNameById, tApi],
  );

  const activeAgent = useMemo(
    () => agentCards.find((agent) => agent.statusKind === 'active') ?? null,
    [agentCards],
  );

  const logEvents = useMemo(() => {
    if (!activeAgent) return runEvents;
    return runEvents.filter(
      (event) => event.agentId === activeAgent.id || event.agentId === DEFINITION_FAILURE_AGENT_ID,
    );
  }, [runEvents, activeAgent]);

  const definitionFailureEvent = useMemo(
    () => runEvents.find((e) => e.agentId === DEFINITION_FAILURE_AGENT_ID) ?? null,
    [runEvents],
  );

  const artifactLinks = useMemo(() => parseArtifactLinks(artifacts), [artifacts]);

  const latestChildWorkflowEvent = useMemo(() => {
    const matches = runEvents.filter(
      (event) => event.agentId === 'workflow-orb' && event.evidenceRef.startsWith('run://'),
    );
    return matches.length > 0 ? matches[matches.length - 1] : null;
  }, [runEvents]);

  const childRunId = latestChildWorkflowEvent
    ? latestChildWorkflowEvent.evidenceRef.slice('run://'.length)
    : null;

  return {
    definitions,
    sequencerNodes,
    activeAgent,
    logEvents,
    definitionFailureEvent,
    artifactLinks,
    latestChildWorkflowEvent,
    childRunId,
  };
}
