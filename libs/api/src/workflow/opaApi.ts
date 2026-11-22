import { apiRequest } from '../core/http';
import { logger } from '../core/logger';
import type { OpaConfig, OpaConfigRequest } from './workflowTypes';

// ── OPA configuration ────────────────────────────────────────────────────

export function getOpaConfig(): Promise<OpaConfig> {
  return apiRequest(`/api/opa-config`, {
    errorMessage: 'Failed to load OPA config',
  });
}

export function saveOpaConfig(request: OpaConfigRequest): Promise<OpaConfig> {
  return apiRequest(`/api/opa-config`, {
    method: 'PUT',
    body: request,
    errorMessage: 'Failed to save OPA config',
  });
}

export async function checkOpaHealth(): Promise<boolean> {
  try {
    const body = await apiRequest<{ reachable?: boolean }>('/api/opa-config/health', {
      errorMessage: 'Failed to check OPA health',
    });
    return Boolean(body.reachable);
  } catch (error) {
    logger.warn('Failed to check OPA health', error);
    return false;
  }
}
