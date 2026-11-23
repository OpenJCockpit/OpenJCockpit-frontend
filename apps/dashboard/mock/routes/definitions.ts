import { type Rec, db, remove, slug, upsert } from '../store';
import { del, get, post, put, str } from './router';

// ── Agent / subagent / skill definitions (keyed by name) ─────────────────
const definitions: [path: string, list: Rec[], generate: (prompt: string) => Rec][] = [
  [
    'agent-definitions',
    db.agents,
    (prompt) => ({
      role: 'generated',
      instructions: prompt,
      subagentNames: [],
      skillNames: [],
      mcpTools: [],
    }),
  ],
  [
    'subagent-definitions',
    db.subagents,
    (prompt) => ({
      parentAgent: '',
      responsibilities: prompt,
      instructions: prompt,
      skillNames: [],
      mcpTools: [],
    }),
  ],
  [
    'skill-definitions',
    db.skills,
    (prompt) => ({
      inputContract: 'text',
      outputContract: 'text',
      executionInstructions: prompt,
      mcpTools: [],
    }),
  ],
];
for (const [path, list, generate] of definitions) {
  get(`/api/${path}`, () => list);
  // Registered before `/:name` routes: generation must not be read as a name.
  post(`/api/${path}/generate-from-prompt`, ({ body }) => {
    const prompt = str(body.prompt);
    return {
      name: slug(prompt.split(/\s+/).slice(0, 3).join(' ')),
      description: prompt,
      ...generate(prompt),
    };
  });
  post(`/api/${path}`, ({ body }) => {
    list.push(body);
    return body;
  });
  put(`/api/${path}/:name`, ({ p, body }) => upsert(list, 'name', p[0], body));
  del(`/api/${path}/:name`, ({ p }) => {
    remove(list, 'name', p[0], 'Definition');
    return {};
  });
}
