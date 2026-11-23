import type { Rec } from '../store';

// Mock of the ControlTower backend, served under /controltower-api (the prefix the dashboard proxies to the
// ControlTower service). State lives as long as the dev server, like the rest of the mock API.
const PREFIX = '/controltower-api';

// Same shape as Ctx and Route in ../routes, declared here so this folder stays type-checkable on its own.
interface Ctx {
  p: string[];
  query: URLSearchParams;
  body: Rec;
}
export type Route = [method: string, pattern: RegExp, handler: (ctx: Ctx) => unknown];

export const controltowerRoutes: Route[] = [];
export const add = (method: string, path: string, handler: Route[2]) => {
  const pattern = new RegExp(`^${PREFIX}${path.replace(/:\w+/g, '([^/]+)')}$`);
  controltowerRoutes.push([method, pattern, handler]);
};

export const str = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;
export const id0 = (p: string[]) => p[0] ?? '';
