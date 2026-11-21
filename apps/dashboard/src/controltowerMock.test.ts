import { describe, expect, it } from 'vitest';
import { controltowerRoutes } from '../mock/controltowerRoutes';
import { MockError, type Rec } from '../mock/store';

function call(method: string, path: string, body: Rec = {}, query = '') {
  for (const [m, pattern, handler] of controltowerRoutes) {
    const match = m === method ? pattern.exec(`/controltower-api${path}`) : null;
    if (match) {
      return handler({
        p: match.slice(1).map(decodeURIComponent),
        query: new URLSearchParams(query),
        body,
      }) as never as Rec & Rec[];
    }
  }
  throw new Error(`no route ${method} ${path}`);
}

const repoBody = { name: 'Repo', gitUrl: 'https://git.test/r.git', cockpitProjectId: 'p1' };

describe('ControlTower mock routes', () => {
  it('manages repositories', () => {
    expect(call('GET', '/projects')).toEqual([]);
    expect(call('POST', '/projects/connection-check')).toMatchObject({ outcome: 'OK' });
    const created = call('POST', '/projects', {
      ...repoBody,
      credentialType: 'HTTPS_TOKEN',
      gitUsername: 'u',
      secret: 's',
      defaultBranch: 'dev',
      workflowId: 'w',
    });
    expect(created).toMatchObject({ hasSecret: true, defaultBranch: 'dev', gitUsername: 'u' });
    expect(() => call('POST', '/projects', repoBody)).toThrow(MockError);
    expect(call('GET', '/projects', {}, 'cockpitProjectId=p1')).toHaveLength(1);
    // A project without a repository gets a linked mock one on first lookup, once.
    const linked = call('GET', '/projects', {}, 'cockpitProjectId=zzz');
    expect(linked).toHaveLength(1);
    expect(linked[0]).toMatchObject({ name: 'zzz-repo', cockpitProjectId: 'zzz' });
    expect(call('GET', '/projects', {}, 'cockpitProjectId=zzz')).toHaveLength(1);
    const updated = call('PUT', `/projects/${String(created.id)}`, { name: 'Renamed', gitUrl: '' });
    expect(updated).toMatchObject({
      name: 'Renamed',
      gitUrl: null,
      defaultBranch: 'main',
      hasSecret: false,
    });
    expect(() => call('PUT', '/projects/nope', {})).toThrow(MockError);
  });

  it('manages templates', () => {
    expect(call('GET', '/templates').length).toBeGreaterThan(0);
    expect(call('POST', '/templates', { name: 'T', kind: 'FEATURE', questions: [] })).toMatchObject(
      { name: 'T' },
    );
    expect(call('GET', '/spec-templates')[0]).toMatchObject({ defaultTemplate: true });
    expect(call('POST', '/spec-templates', { name: 'S', content: 'c' })).toMatchObject({
      defaultTemplate: false,
    });
  });

  it('runs an interview through to approved, dispatched and done specs', () => {
    const started = call('POST', '/interviews', {
      projectId: 'p1',
      templateId: 'tpl-project',
      featureRequest: 'F',
    });
    expect(started).toMatchObject({ status: 'ACTIVE', title: 'F' });
    expect(
      call('POST', '/interviews', { projectId: 'p1', templateId: 'tpl-project' }),
    ).toMatchObject({
      title: 'New project',
    });
    expect(() => call('POST', '/interviews', { templateId: 'missing' })).toThrow(MockError);
    const id = String(started.id);
    expect(call('GET', `/interviews/${id}`)).toMatchObject({ id });
    expect(call('GET', '/projects/p1/interviews')).toHaveLength(2);

    // The template has several questions: the interview stays ACTIVE until the last one is answered.
    const questionCount = (call('GET', '/templates') as Rec[]).find((t) => t.id === 'tpl-project')
      ?.questions as unknown[];
    let done = call('POST', `/interviews/${id}/answers`, { answer: 'a' });
    expect(done).toMatchObject({ status: 'ACTIVE' });
    for (let i = 1; i < questionCount.length; i += 1) {
      done = call('POST', `/interviews/${id}/answers`, { answer: 'a' });
    }
    expect(done).toMatchObject({ status: 'COMPLETE', currentQuestion: '' });
    expect(done.answers).toHaveLength(questionCount.length);

    const [spec] = call('POST', `/interviews/${id}/generate`) as unknown as Rec[];
    const specId = String(spec?.id);
    expect(call('GET', '/projects/p1/specs')).toHaveLength(1);
    expect(call('GET', '/projects/p1/queue/proposal')).toEqual([]);
    expect(call('GET', '/projects/p1/graph')).toMatchObject({ nodes: [{ ready: false }] });

    expect(call('POST', `/specs/${specId}/approve`)).toMatchObject({ status: 'APPROVED' });
    expect(call('GET', '/projects/p1/graph')).toMatchObject({ nodes: [{ ready: true }] });
    expect(call('GET', '/projects/p1/queue/proposal')).toHaveLength(1);
    expect(call('POST', '/projects/p1/queue/dispatch')).toEqual([{ specId, result: 'DISPATCHED' }]);
    expect(call('POST', `/specs/${specId}/complete`)).toMatchObject({ status: 'DONE' });
    expect(() => call('POST', '/specs/nope/approve')).toThrow(MockError);
  });

  it('reads, saves and tests the policy settings', () => {
    expect(call('GET', '/settings')).toMatchObject({ editable: true, policy: { enabled: false } });
    expect(call('PUT', '/settings/policy', { enabled: true })).toMatchObject({
      policy: { enabled: true },
    });
    expect(call('POST', '/settings/policy/test')).toMatchObject({ reachable: true });
  });
});
