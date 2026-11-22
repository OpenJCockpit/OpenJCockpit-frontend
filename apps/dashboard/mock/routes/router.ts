import type { Rec } from '../store';

export interface Ctx {
  /** Path segments captured by the route's regex, URL-decoded. */
  p: string[];
  query: URLSearchParams;
  body: Rec;
}
type Handler = (ctx: Ctx) => unknown;
export type Route = [method: string, pattern: RegExp, handler: Handler];

/** Every route registered by the domain modules, in registration order (first match wins). */
export const routes: Route[] = [];
const add = (method: string, path: string, handler: Handler) => {
  // `:name` matches one path segment.
  const pattern = new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`);
  routes.push([method, pattern, handler]);
};
export const get = (path: string, h: Handler) => add('GET', path, h);
export const post = (path: string, h: Handler) => add('POST', path, h);
export const put = (path: string, h: Handler) => add('PUT', path, h);
export const patch = (path: string, h: Handler) => add('PATCH', path, h);
export const del = (path: string, h: Handler) => add('DELETE', path, h);

export const str = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;
export const without = (rec: Rec, ...keys: string[]) =>
  Object.fromEntries(Object.entries(rec).filter(([key]) => !keys.includes(key)));
