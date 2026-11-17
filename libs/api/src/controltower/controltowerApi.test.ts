import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answerControlTowerInterview,
  approveControlTowerSpec,
  checkControlTowerConnection,
  completeControlTowerSpec,
  CONTROLTOWER_API_PREFIX,
  createControlTowerProject,
  createControlTowerSpecTemplate,
  createControlTowerTemplate,
  dispatchControlTowerSpecs,
  generateControlTowerSpecs,
  getControlTowerGraph,
  getControlTowerInterview,
  getControlTowerProjectByCockpitProject,
  getControlTowerQueueProposal,
  getControlTowerSettings,
  listControlTowerInterviews,
  listControlTowerProjects,
  listControlTowerSpecs,
  listControlTowerSpecTemplates,
  listControlTowerTemplates,
  saveControlTowerPolicy,
  startControlTowerInterview,
  testControlTowerPolicy,
  updateControlTowerProject,
} from './controltowerApi';
import type { ControlTowerPolicySettings, ControlTowerProjectRequest } from './controltowerTypes';

const mockFetch = vi.fn();

function ok(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}
function fail(status: number, body?: unknown) {
  return {
    ok: false,
    status,
    json: () => (body ? Promise.resolve(body) : Promise.reject(new Error('not json'))),
  };
}

const projectRequest: ControlTowerProjectRequest = {
  name: 'Shop',
  gitUrl: 'https://git.example/shop.git',
  credentialType: 'NONE',
  cockpitProjectId: 'c1',
  workflowId: 'w1',
};
const policy: ControlTowerPolicySettings = {
  enabled: true,
  url: 'http://opa:8181',
  decisionPath: 'openjcontroltower/decision',
  failOpen: false,
};

function lastCall() {
  const [url, init] = mockFetch.mock.calls.at(-1)!;
  return { url: url as string, init };
}

describe('controltowerApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['listProjects', () => listControlTowerProjects(), '/projects'],
    ['listTemplates', () => listControlTowerTemplates(), '/templates'],
    ['listSpecTemplates', () => listControlTowerSpecTemplates(), '/spec-templates'],
    ['listInterviews', () => listControlTowerInterviews('p 1'), '/projects/p%201/interviews'],
    ['getInterview', () => getControlTowerInterview('i/1'), '/interviews/i%2F1'],
    ['listSpecs', () => listControlTowerSpecs('p1'), '/projects/p1/specs'],
    ['getGraph', () => getControlTowerGraph('p1'), '/projects/p1/graph'],
    ['proposal', () => getControlTowerQueueProposal('p1'), '/projects/p1/queue/proposal'],
    ['settings', () => getControlTowerSettings(), '/settings'],
  ])('GETs %s through the ControlTower prefix without a body', async (_name, call, path) => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await call();
    const { url, init } = lastCall();
    expect(url).toContain(`${CONTROLTOWER_API_PREFIX}${path}`);
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('forwards the abort signal on reads', async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    const controller = new AbortController();
    await listControlTowerSpecs('p1', controller.signal);
    expect(lastCall().init.signal).toBe(controller.signal);
  });

  it('returns the repository linked to a Cockpit project, or null', async () => {
    mockFetch.mockResolvedValueOnce(ok([{ id: 'r1' }]));
    expect(await getControlTowerProjectByCockpitProject('c 1')).toEqual({ id: 'r1' });
    expect(lastCall().url).toContain('/controltower-api/projects?cockpitProjectId=c%201');
    mockFetch.mockResolvedValueOnce(ok([]));
    expect(await getControlTowerProjectByCockpitProject('c2')).toBeNull();
  });

  it.each([
    ['createProject', () => createControlTowerProject(projectRequest), 'POST', '/projects'],
    [
      'updateProject',
      () => updateControlTowerProject('r 1', projectRequest),
      'PUT',
      '/projects/r%201',
    ],
    [
      'connectionCheck',
      () => checkControlTowerConnection({ gitUrl: 'https://x', credentialType: 'NONE' }),
      'POST',
      '/projects/connection-check',
    ],
    [
      'createTemplate',
      () => createControlTowerTemplate({ name: 'T', kind: 'FEATURE', questions: [] }),
      'POST',
      '/templates',
    ],
    [
      'createSpecTemplate',
      () => createControlTowerSpecTemplate({ name: 'S', content: '# S' }),
      'POST',
      '/spec-templates',
    ],
    [
      'startInterview',
      () => startControlTowerInterview({ projectId: 'p1', templateId: 't1' }),
      'POST',
      '/interviews',
    ],
    ['answer', () => answerControlTowerInterview('i1', 'yes'), 'POST', '/interviews/i1/answers'],
    [
      'generate',
      () => generateControlTowerSpecs('i1', { specTemplateId: 's1' }),
      'POST',
      '/interviews/i1/generate',
    ],
    [
      'dispatch',
      () => dispatchControlTowerSpecs('p1', true),
      'POST',
      '/projects/p1/queue/dispatch',
    ],
    ['savePolicy', () => saveControlTowerPolicy(policy), 'PUT', '/settings/policy'],
    ['testPolicy', () => testControlTowerPolicy(policy), 'POST', '/settings/policy/test'],
  ])('sends %s as JSON', async (_name, call, method, path) => {
    mockFetch.mockResolvedValueOnce(ok({}));
    await call();
    const { url, init } = lastCall();
    expect(url).toContain(`${CONTROLTOWER_API_PREFIX}${path}`);
    expect(init.method).toBe(method);
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('sends the answer and the dispatch flag as the body', async () => {
    mockFetch.mockResolvedValueOnce(ok({}));
    await answerControlTowerInterview('i1', 'yes');
    expect(JSON.parse(lastCall().init.body)).toEqual({ answer: 'yes' });
    mockFetch.mockResolvedValueOnce(ok([]));
    await dispatchControlTowerSpecs('p1', false);
    expect(JSON.parse(lastCall().init.body)).toEqual({ repositoryPublished: false });
  });

  it('generates specs without a body when no template is chosen', async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await generateControlTowerSpecs('i1');
    expect(lastCall().init.body).toBeUndefined();
  });

  it('POSTs approve and complete without a body', async () => {
    mockFetch.mockResolvedValue(ok({}));
    await approveControlTowerSpec('s 1');
    expect(lastCall().url).toContain('/controltower-api/specs/s%201/approve');
    expect(lastCall().init.body).toBeUndefined();
    await completeControlTowerSpec('s1');
    expect(lastCall().url).toContain('/controltower-api/specs/s1/complete');
  });

  it('keeps the readable reasons of an OPA denial', async () => {
    mockFetch.mockResolvedValueOnce(
      fail(403, { error: 'Denied by policy: repository not published' }),
    );
    await expect(approveControlTowerSpec('s1')).rejects.toMatchObject({
      status: 403,
      message: 'Denied by policy: repository not published',
    });
  });

  it('maps a conflict from the Git job onto an ApiError', async () => {
    mockFetch.mockResolvedValueOnce(fail(409, { error: 'Branch already exists' }));
    await expect(approveControlTowerSpec('s1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Branch already exists',
    });
  });

  it.each([
    [
      'createProject',
      () => createControlTowerProject(projectRequest),
      'Failed to add the repository',
    ],
    [
      'updateProject',
      () => updateControlTowerProject('r1', projectRequest),
      'Failed to save the repository',
    ],
    ['approve', () => approveControlTowerSpec('s1'), 'Failed to approve the spec'],
    ['dispatch', () => dispatchControlTowerSpecs('p1', true), 'Failed to dispatch'],
    ['savePolicy', () => saveControlTowerPolicy(policy), 'Failed to save the policy settings'],
    ['testPolicy', () => testControlTowerPolicy(policy), 'Failed to test the policy settings'],
  ])('%s falls back to a status message when the body has none', async (_n, call, fallback) => {
    mockFetch.mockResolvedValueOnce(fail(403));
    await expect(call()).rejects.toMatchObject({ message: `${fallback}: 403`, status: 403 });
  });
});
