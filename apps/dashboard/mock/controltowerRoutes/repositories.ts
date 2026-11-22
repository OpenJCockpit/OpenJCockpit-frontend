import { type Rec, MockError, findBy, nextId, upsert } from '../store';
import { add, id0, str } from './router';
import { repositories, seedRepository } from './state';

add('GET', '/projects', ({ query }) => {
  const cockpitProjectId = query.get('cockpitProjectId');
  if (!cockpitProjectId) {
    return repositories;
  }
  // Every project gets a linked mock repository on first lookup, so the ControlTower pages are usable without
  // going through the connect form.
  if (!repositories.some((r) => r.cockpitProjectId === cockpitProjectId)) {
    repositories.push(
      toRepository(nextId('ct-repo'), {
        name: `${cockpitProjectId}-repo`,
        gitUrl: `https://git.example.com/mock/${cockpitProjectId}.git`,
        cockpitProjectId,
      }),
    );
    const created = repositories[repositories.length - 1];
    seedRepository(str(created?.id));
  }
  return repositories.filter((r) => r.cockpitProjectId === cockpitProjectId);
});
add('POST', '/projects/connection-check', () => ({
  reachable: true,
  outcome: 'OK',
  message: 'Repository reachable.',
}));
const toRepository = (id: string, body: Rec): Rec => ({
  id,
  name: str(body.name),
  gitUrl: str(body.gitUrl) || null,
  defaultBranch: str(body.defaultBranch, 'main'),
  credentialType: str(body.credentialType, 'NONE'),
  gitUsername: str(body.gitUsername) || null,
  hasSecret: str(body.secret) !== '',
  cockpitProjectId: str(body.cockpitProjectId),
  workflowId: str(body.workflowId),
});
add('POST', '/projects', ({ body }) => {
  if (repositories.some((r) => r.cockpitProjectId === body.cockpitProjectId)) {
    throw new MockError(409, 'CONFLICT', 'A repository is already linked to this project');
  }
  const created = toRepository(nextId('ct-repo'), body);
  repositories.push(created);
  return created;
});
add('PUT', '/projects/:id', ({ p, body }) => {
  findBy(repositories, 'id', id0(p), 'Repository');
  return upsert(repositories, 'id', id0(p), toRepository(id0(p), body));
});
