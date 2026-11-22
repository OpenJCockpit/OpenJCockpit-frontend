import { apiRequest, apiRequestVoid } from '../core/http';
import { logger } from '../core/logger';
import type {
  A2AAgentCard,
  A2AService,
  A2AServiceRequest,
  AgentCatalog,
  AgentSpec,
  SkillCatalog,
  SkillSpec,
  SubagentSpec,
} from './workflowTypes';

// ── Agent definitions ────────────────────────────────────────────────────

/** Local /agents folder plus the agents of each A2A provider (e.g. LiteLLM). */
export function getAgentCatalog(): Promise<AgentCatalog> {
  return apiRequest(`/api/agent-catalog`, {
    errorMessage: 'Failed to load agent catalog',
  });
}

/** The agent card the A2A provider hosts for one agent, fetched live through the backend. */
export function getProviderAgentCard(provider: string, name: string): Promise<A2AAgentCard> {
  return apiRequest(
    `/api/agent-catalog/providers/${encodeURIComponent(provider)}/agents/${encodeURIComponent(name)}/card`,
    {
      errorMessage: 'Failed to load agent card',
    },
  );
}

export async function listAgentSpecs(): Promise<AgentSpec[]> {
  try {
    return await apiRequest('/api/agent-definitions', {
      errorMessage: 'Failed to load agent definitions',
    });
  } catch (error) {
    logger.warn('Falling back to empty agent specs', error);
    return [];
  }
}

export function createAgentSpec(request: AgentSpec): Promise<AgentSpec> {
  return apiRequest(`/api/agent-definitions`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to create agent definition',
  });
}

export function updateAgentSpec(name: string, request: AgentSpec): Promise<AgentSpec> {
  return apiRequest(`/api/agent-definitions/${name}`, {
    method: 'PUT',
    body: request,
    errorMessage: 'Failed to update agent definition',
  });
}

export function deleteAgentSpec(name: string): Promise<void> {
  return apiRequestVoid(`/api/agent-definitions/${name}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete agent definition',
  });
}

export function generateAgentSpec(prompt: string): Promise<AgentSpec> {
  return apiRequest(`/api/agent-definitions/generate-from-prompt`, {
    method: 'POST',
    body: { prompt },
    errorMessage: 'Failed to generate agent definition',
  });
}

// ── Subagent definitions ─────────────────────────────────────────────────

export function listSubagentSpecs(signal?: AbortSignal): Promise<SubagentSpec[]> {
  return apiRequest('/api/subagent-definitions', {
    signal,
    errorMessage: 'Failed to load subagent definitions',
  });
}

export function createSubagentSpec(request: SubagentSpec): Promise<SubagentSpec> {
  return apiRequest(`/api/subagent-definitions`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to create subagent definition',
  });
}

export function updateSubagentSpec(name: string, request: SubagentSpec): Promise<SubagentSpec> {
  return apiRequest(`/api/subagent-definitions/${name}`, {
    method: 'PUT',
    body: request,
    errorMessage: 'Failed to update subagent definition',
  });
}

export function deleteSubagentSpec(name: string): Promise<void> {
  return apiRequestVoid(`/api/subagent-definitions/${name}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete subagent definition',
  });
}

export function generateSubagentSpec(prompt: string): Promise<SubagentSpec> {
  return apiRequest(`/api/subagent-definitions/generate-from-prompt`, {
    method: 'POST',
    body: { prompt },
    errorMessage: 'Failed to generate subagent definition',
  });
}

// ── Skill definitions ────────────────────────────────────────────────────

export function listSkillSpecs(signal?: AbortSignal): Promise<SkillSpec[]> {
  return apiRequest('/api/skill-definitions', {
    signal,
    errorMessage: 'Failed to load skill definitions',
  });
}

export function createSkillSpec(request: SkillSpec): Promise<SkillSpec> {
  return apiRequest(`/api/skill-definitions`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to create skill definition',
  });
}

export function updateSkillSpec(name: string, request: SkillSpec): Promise<SkillSpec> {
  return apiRequest(`/api/skill-definitions/${name}`, {
    method: 'PUT',
    body: request,
    errorMessage: 'Failed to update skill definition',
  });
}

export function deleteSkillSpec(name: string): Promise<void> {
  return apiRequestVoid(`/api/skill-definitions/${name}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete skill definition',
  });
}

export function generateSkillSpec(prompt: string): Promise<SkillSpec> {
  return apiRequest(`/api/skill-definitions/generate-from-prompt`, {
    method: 'POST',
    body: { prompt },
    errorMessage: 'Failed to generate skill definition',
  });
}

// ── A2A services ─────────────────────────────────────────────────────────

export function listA2AServices(): Promise<A2AService[]> {
  return apiRequest(`/api/a2a-services`, {
    errorMessage: 'Failed to load A2A services',
  });
}

export function createA2AService(request: A2AServiceRequest): Promise<A2AService> {
  return apiRequest(`/api/a2a-services`, {
    method: 'POST',
    body: request,
    errorMessage: 'Failed to add A2A service',
  });
}

export function updateA2AService(id: string, request: A2AServiceRequest): Promise<A2AService> {
  return apiRequest(`/api/a2a-services/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: request,
    errorMessage: 'Failed to save A2A service',
  });
}

export function deleteA2AService(id: string): Promise<void> {
  return apiRequestVoid(`/api/a2a-services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    errorMessage: 'Failed to remove A2A service',
  });
}

// ── Skill catalog (local + marketplace) ──────────────────────────────────
// Intentionally throw-on-failure, unlike listSkillSpecs above: a real failure
// (e.g. 401) must surface as a real error, never as silently-rendered mock data.

export function getSkillCatalog(): Promise<SkillCatalog> {
  return apiRequest(`/api/skill-catalog`, {
    errorMessage: 'Failed to load skill catalog',
  });
}
