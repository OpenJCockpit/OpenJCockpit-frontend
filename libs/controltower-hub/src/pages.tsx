import { lazy, type ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { CONTROLTOWER_ROUTE } from './routePaths';

/** `global` pages work without a project; `project` pages need a selected project and its linked repository. */
export type TabKey = 'overview' | 'interviews' | 'specs' | 'graph' | 'queue' | 'templates';

export type PageScope = 'global' | 'project';

export interface ControlTowerPage {
  /** Route path relative to the app route; empty for the index page. */
  path: string;
  /** Key of the tab label under `tabs.` in the locale files. */
  tabKey: TabKey;
  scope: PageScope;
  Component: ComponentType;
}

/** Single source of truth for the page tabs and the route tree. Tab order is array order. */
export const pages: readonly ControlTowerPage[] = [
  {
    path: '',
    tabKey: 'overview',
    scope: 'project',
    Component: lazy(async () => ({
      default: (await import('./OverviewPage/OverviewPage')).OverviewPage,
    })),
  },
  {
    path: 'interviews',
    tabKey: 'interviews',
    scope: 'project',
    Component: lazy(async () => ({
      default: (await import('./InterviewsPage/InterviewsPage')).InterviewsPage,
    })),
  },
  {
    path: 'specs',
    tabKey: 'specs',
    scope: 'project',
    Component: lazy(async () => ({ default: (await import('./SpecsPage/SpecsPage')).SpecsPage })),
  },
  {
    path: 'graph',
    tabKey: 'graph',
    scope: 'project',
    Component: lazy(async () => ({ default: (await import('./GraphPage/GraphPage')).GraphPage })),
  },
  {
    path: 'queue',
    tabKey: 'queue',
    scope: 'project',
    Component: lazy(async () => ({ default: (await import('./QueuePage/QueuePage')).QueuePage })),
  },
  {
    path: 'templates',
    tabKey: 'templates',
    scope: 'global',
    Component: lazy(async () => ({
      default: (await import('./TemplatesPage/TemplatesPage')).TemplatesPage,
    })),
  },
];

/** Absolute URL of a page, e.g. `/controltower/graph`. */
export function pageUrl({ path }: ControlTowerPage): string {
  return path ? `${CONTROLTOWER_ROUTE}/${path}` : CONTROLTOWER_ROUTE;
}

/** The page as a route object; the index page becomes an index route. */
export function pageRoute(page: ControlTowerPage): RouteObject {
  const element = <page.Component />;
  return page.path ? { path: page.path, element } : { index: true, element };
}
