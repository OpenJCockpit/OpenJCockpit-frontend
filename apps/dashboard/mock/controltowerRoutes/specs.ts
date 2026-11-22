import { add, id0, str } from './router';
import { byProject, isReady, spec, specs } from './state';

add('GET', '/projects/:id/specs', ({ p }) => byProject(specs, id0(p)));
add('POST', '/specs/:id/approve', ({ p }) =>
  Object.assign(spec(id0(p)), { status: 'APPROVED', branch: `spec/${str(spec(id0(p)).slug)}` }),
);
add('POST', '/specs/:id/complete', ({ p }) => Object.assign(spec(id0(p)), { status: 'DONE' }));
add('GET', '/projects/:id/graph', ({ p }) => {
  const own = byProject(specs, id0(p));
  return {
    nodes: own.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      dependsOn: s.dependsOn,
      ready: isReady(s, own),
    })),
    topologicalOrder: own.map((s) => s.id),
  };
});
add('GET', '/projects/:id/queue/proposal', ({ p }) => {
  const own = byProject(specs, id0(p));
  return own
    .filter((s) => isReady(s, own))
    .map((s, index) => ({
      specId: s.id,
      title: s.title,
      path: s.specPath,
      priority: index + 1,
      reason: 'All dependencies are done.',
    }));
});
add('POST', '/projects/:id/queue/dispatch', ({ p }) => {
  const own = byProject(specs, id0(p));
  return own
    .filter((s) => isReady(s, own))
    .map((s) => {
      // The webhooks spec simulates an uncertain HTTP outcome: it is reported UNKNOWN and not marked dispatched.
      if (s.slug === 'webhooks') return { specId: s.id, result: 'UNKNOWN' };
      s.status = 'DISPATCHED';
      return { specId: s.id, result: 'DISPATCHED' };
    });
});
// OpenJCockpit never finishes in the mock, so no dispatched spec changes; "Mark done manually" completes them.
add('POST', '/projects/:id/queue/reconcile', () => []);
