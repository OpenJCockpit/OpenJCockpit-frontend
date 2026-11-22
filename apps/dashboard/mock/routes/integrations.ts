import { type Rec, db, findBy, nextId, now, remove, slug, upsert } from '../store';
import { del, get, post, put, str, without } from './router';

// ── A2A services, catalogs, marketplaces ─────────────────────────────────
const a2aService = (body: Rec, id: string): Rec => ({
  id,
  name: body.name,
  type: 'A2A',
  source: 'DASHBOARD',
  editable: true,
  baseUrl: body.baseUrl,
  publicUrl: body.publicUrl ?? null,
  hasApiKey: Boolean(body.apiKey),
  callerTokenUrl: body.callerTokenUrl ?? null,
  callerClientId: body.callerClientId ?? null,
  hasCallerClientSecret: Boolean(body.callerClientSecret),
  status: 'OK',
  message: null,
  agentCount: 0,
  updatedAt: now(),
});
get('/api/a2a-services', () => db.a2aServices);
post('/api/a2a-services', ({ body }) => {
  const created = a2aService(body, str(body.id) || slug(str(body.name)));
  db.a2aServices.push(created);
  return created;
});
put('/api/a2a-services/:id', ({ p, body }) =>
  upsert(db.a2aServices, 'id', p[0], a2aService(body, p[0])),
);
del('/api/a2a-services/:id', ({ p }) => {
  remove(db.a2aServices, 'id', p[0], 'A2A service');
  return {};
});

get('/api/agent-catalog', () => ({
  local: {
    name: 'Local',
    status: 'OK',
    agents: db.agents.map((agent) => ({
      id: agent.name,
      name: agent.name,
      description: agent.description,
      path: `${str(agent.name)}.md`,
      folders: [],
      skills: agent.skillNames ?? [],
      tools: [],
      valid: true,
    })),
  },
  providers: db.a2aServices.map((s) => ({ name: s.name, type: s.type, status: 'OK', agents: [] })),
}));
get('/api/agent-catalog/providers/:provider/agents/:agent/card', ({ p }) => ({
  name: p[1],
  description: `Mock agent card for ${p[1]}`,
  version: '1.0.0',
  protocolVersion: '0.3.0',
  capabilities: { streaming: false },
  skills: [],
}));

get('/api/skill-catalog', () => {
  const enabled = db.marketplaces.filter((m) => m.enabled === true);
  return {
    localSkills: db.skills,
    externalSkills: enabled.map((m) => ({
      marketplaceId: m.id,
      marketplaceName: m.name,
      name: `${slug(str(m.name))}-sample`,
      description: 'Sample marketplace skill',
    })),
    sources: [
      {
        kind: 'LOCAL',
        marketplaceId: null,
        name: 'Local',
        outcome: 'SUCCESS',
        itemCount: db.skills.length,
        httpStatus: null,
      },
      ...enabled.map((m) => ({
        kind: 'MARKETPLACE',
        marketplaceId: m.id,
        name: m.name,
        outcome: 'SUCCESS',
        itemCount: 1,
        httpStatus: 200,
      })),
    ],
  };
});

const marketplace = (body: Rec, previous?: Rec): Rec => ({
  ...previous,
  ...without(body, 'apiKey'),
  id: previous?.id ?? nextId('m'),
  hasApiKey: Boolean(body.apiKey) || previous?.hasApiKey === true,
  createdBy: previous?.createdBy ?? 'dev',
  createdAt: previous?.createdAt ?? now(),
  updatedAt: now(),
});
get('/api/skills-marketplaces', () => db.marketplaces);
post('/api/skills-marketplaces', ({ body }) => {
  const created = marketplace(body);
  db.marketplaces.push(created);
  return created;
});
put('/api/skills-marketplaces/:id', ({ p, body }) =>
  upsert(
    db.marketplaces,
    'id',
    p[0],
    marketplace(body, findBy(db.marketplaces, 'id', p[0], 'Marketplace')),
  ),
);
del('/api/skills-marketplaces/:id', ({ p }) => {
  remove(db.marketplaces, 'id', p[0], 'Marketplace');
  return {};
});

// ── OPA ──────────────────────────────────────────────────────────────────
get('/api/opa-config', () => db.opa);
put('/api/opa-config', ({ body }) => {
  Object.assign(db.opa, without(body, 'authToken'), {
    hasAuthToken: Boolean(body.authToken) || db.opa.hasAuthToken === true,
  });
  return db.opa;
});
get('/api/opa-config/health', () => ({ reachable: db.opa.enabled === true }));
