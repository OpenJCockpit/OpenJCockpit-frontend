# Can the frontend run without ControlTower or without OpenJCockpit?

Analysis, 2026-11-20, branch `feat/improve-control-tower`.

## Short answer

| Scenario | Works today? | Summary |
| --- | --- | --- |
| **ControlTower missing**: remote not deployed, or its entry removed from the manifest | **Yes** | The host skips the remote. Nothing else depends on it. |
| **ControlTower missing**: remote deployed, backend (`CONTROLTOWER_UPSTREAM`) down | **Partly** | The app starts, but the Control Tower nav entry, home widget and two settings sections stay and fail with generic errors. |
| **OpenJCockpit missing**: the Cockpit backend (`/api`) and/or Keycloak down | **No** | Without Keycloak nothing loads. Without `/api`, the host starts with an empty project list and silently strands every project-scoped view, including Control Tower. |
| **OpenJCockpit missing, ControlTower only** | **No, by design today** | Control Tower pages need a *Cockpit project* (`RequireProject`) and the project list comes from `/api/projects`. |

The two are not symmetric. ControlTower is an optional add-on to OpenJCockpit. OpenJCockpit is the platform (identity, projects, the host's own pages). The recommendation is to make the first case a supported, tested configuration, and to make the second case fail visibly instead of silently. Making ControlTower run without OpenJCockpit is a larger product decision (see option C below).

## How the pieces connect

- **Host `apps/dashboard`** talks to `/api` (OpenJCockpit `ai-control-service`) and loads Keycloak settings from `/config.json`.
- **Remote `remote-controltower`** is one of five federated remotes, listed in `public/federation.manifest.json` (dev) or `FEDERATION_MANIFEST` (compose). It re-exports `libs/controltower-hub`.
- **ControlTower backend** is reached only through `/controltower-api/*` (nginx and the Vite proxy rewrite it to the backend's `/api/*`), via `libs/api/src/controltower/controltowerApi.ts`.
- **Link between the two systems** is the Cockpit project id: `getControlTowerProjectByCockpitProject` finds the ControlTower repository linked to the selected Cockpit project.
- **One token** (Keycloak) is used for both backends (`apiRequest`).

## Scenario 1: ControlTower missing

### 1a. Remote not deployed / not in the manifest (works)

Verified in code:

- `loadRemoteApps` uses `Promise.allSettled` with a 5 s timeout per remote. A failed remote is logged and skipped, and the host never throws (`apps/dashboard/src/federation/loadRemoteApps.ts`).
- A missing or broken manifest leaves the host with no remotes (`apps/dashboard/src/main.tsx`, `loadRemotes`).
- No host source file imports `controltower-hub`, and no host route or nav entry is hard-coded. The only host files that mention it are the mock server (`apps/dashboard/mock/controltowerRoutes.ts`, dev only) and the nginx/vite proxy rules.
- nginx uses variable upstreams with a resolver, so a missing `remote-controltower` container gives a 502 for `/remotes/controltower/...` and does not stop nginx from starting. The `CONTROLTOWER_UPSTREAM` variable is also resolved per request.
- The nav, home widgets and settings sections all come from the `AppRegistry`, so they disappear with the remote. `homeLayout.ts` drops saved layout ids that no longer match a widget.
- `libs/api` still exports the ControlTower client and types. That is inert code (about 270 lines of functions plus generated types) and does not call anything unless used.

Gaps even in this case:

1. **The "Some apps are unavailable" notice does not exist.** `docs/frontend-architecture.md` says failed remotes are "listed in the 'Some apps are unavailable' notice". `RemoteFailuresContext` is provided in `RemoteApps.tsx` but **nothing consumes it** (no component, no locale string). A remote that is listed in the manifest but is down simply vanishes. An operator cannot tell "not installed" from "crashed". This matters most for an optional remote.
2. **No supported "ControlTower off" configuration.** Compose always starts `remote-controltower` and hard-codes it in `FEDERATION_MANIFEST`. `npm run start:hub`, `build:hub`, `scripts/trivy-scan.sh` and `README.md` all assume five remotes. There is no documented or tested way to run four.
3. **Build-time coupling.** `nx run api:generate-controltower` and CI (`frontend-ci.yml`) check out the `OpenJControlTower` repository to check the generated types for staleness. A contributor or a fork without that repository cannot pass `generate` / the stale-check. This is a CI and developer-experience coupling, not a runtime one.

### 1b. Remote deployed, backend down (degraded, unclear)

- The remote loads, so the **Control Tower nav entry, the "Ready to dispatch" home widget and the settings sections `controltower-repository` and `controltower-policy` are all registered**.
- Every call then fails at `/controltower-api/...` with a 502 from nginx (an HTML body). `parseApiError` falls back to the generic message, and `QueryState` shows `queue.loadFailed` or `repository.loadFailed` with Retry. A 5xx `ApiError` is not retried automatically (only network errors are, once), so the user gets an error immediately and the home widget shows an error card on every visit.
- `useReconcileDispatched` swallows errors, which is fine.
- The user cannot tell "ControlTower is not running" from "your repository is misconfigured". Both show the same load-failed text.
- Nothing in the UI distinguishes "feature unavailable" from "transient error".

## Scenario 2: OpenJCockpit missing

### 2a. Keycloak unreachable

`main.tsx` waits on `loadKeycloakConfig()` and then the app waits on `useAuthSession`. There is no unauthenticated mode, so **no page renders at all** and the user sees "authenticating". That is true whether or not ControlTower is available. Keycloak ships with the OpenJCockpit stack, so "OpenJCockpit missing" currently includes "no login". ControlTower validates the same tokens.

### 2b. Keycloak up, `/api` (ai-control-service) down

- `useProjectsQuery` fails. `App.tsx` deliberately continues "with no projects" so a backend outage does not bounce the user to Keycloak.
- The user lands on the project selection page with an **empty list and no error** (`ProjectSelection` has no error state for a failed load; `isError` is read nowhere). It looks like "you have no projects", not "the backend is down".
- Every project-scoped route (`RequireProject`) redirects there. That includes all Control Tower pages except **Templates**, which is the only `scope: 'global'` page.
- Home widgets and the remaining apps (skills, specs, evidence, quality) each show their own load errors.
- **Control Tower is unusable even if its own backend is healthy**, because it needs `useSelectedProject()`, which needs a Cockpit project. The data model ties a ControlTower repository to a Cockpit project id. Dispatch (`dispatchControlTowerSpecs`) also hands specs to OpenJCockpit server-side, so the product genuinely needs both.

## What to change

### Phase 1: make "ControlTower is optional" a supported configuration (small)

1. **Surface remote failures** (fixes gap 1a.1). Consume `RemoteFailuresContext` in the site header or home page and show a dismissible notice naming the failed remotes. Use `manifest.ts` to tell "not in the manifest" (silent) from "in the manifest but failed" (notice). Add the locale strings in all four languages (`check:i18n`). Update `docs/frontend-architecture.md` only if the behaviour differs from what it describes.
2. **Make the remote set configurable in dev and compose.**
   - Compose: move `remote-controltower` behind a profile (`profiles: ["controltower"]`) and build `FEDERATION_MANIFEST` from a variable, e.g. `FEDERATION_MANIFEST` in `.env` with a documented four-remote value, or an overlay `docker-compose.controltower.yml`.
   - Dev: a `start:hub:core` script without `remote-controltower` and without the 4407 manifest entry. Today the dev manifest in `public/federation.manifest.json` lists it unconditionally. A dev-time 404 for it is handled and produces only a console error.
3. **Add a test that runs the host with the controltower remote absent or failing.** `loadRemoteApps.test.ts` covers one failing remote generally. Add a host-level test (e.g. in `App.routes.test.tsx`) that mounts `App` with four remotes and asserts no Control Tower nav item, no widget, no settings section, and no errors.
4. **Document it** in `README.md` and `docs/hub-app-integration-guide.md`: how to run without ControlTower, and that `CONTROLTOWER_UPSTREAM` can stay unset when the remote is not deployed.

### Phase 2: degrade cleanly when the remote is up but the backend is down (small to medium)

5. **Availability probe inside the remote.** Add one cheap query (`useControlTowerAvailable`) against `/controltower-api/settings` (or a health endpoint if the backend has one; check `contracts/openapi.yaml`). Use it in:
   - the shell and `RepositoryGate`: render one clear "Control Tower is not reachable" empty state with Retry, instead of per-page load-failed text;
   - `QueueWidget`: show a muted "unavailable" state instead of an error card.
6. **Hide the nav entry when unavailable.** `AppDefinition.showInNav` is static today. If hiding is wanted, extend the contract additively (e.g. an optional `useAvailable?: () => boolean` hook the registry calls, behind a `HUB_CONTRACT_VERSION` bump only if the host must understand it). The simpler alternative is to keep the entry and rely on item 5.
7. **Treat 502/503/504 as "unavailable" in `apiRequest`.** `parseApiError` should recognise a non-JSON gateway response and use a dedicated message (and `ApiError.status` to let callers branch). It benefits both backends.

### Phase 3: make "OpenJCockpit is down" visible (small)

8. **Show a project-load error.** `App.tsx` already has `projectsQuery`. Pass `isError` to `ProjectSelection` and render an `ErrorState` with Retry, rather than the empty list. This is the most valuable single change for the OpenJCockpit-missing case, and it removes the "you have no projects" misread.
9. **Explain Control Tower's dependency.** When `useHubProject().selected` is null and the projects query failed, `RequireProject` could route to the same error state. Optionally let the Control Tower **Templates** page (global) stay reachable without a project (it already is).

### Option C (a product decision, not recommended now): ControlTower without OpenJCockpit

This would need ControlTower to own its project list (it already has `/api/projects`), a host that can take its project source from either backend, and a non-Cockpit dispatch target. It conflicts with the current model (repository linked by Cockpit project id; dispatch into OpenJCockpit) and with the host design (one `Project` type from `libs/api`). Only pursue it if a standalone ControlTower is a stated goal. Note also that Keycloak would still have to be provided separately.

## Suggested order and effort

| # | Change | Effort | Risk |
| --- | --- | --- | --- |
| 8 | Project-load error state in `ProjectSelection` | S | Low |
| 1 | Render the remote-failure notice (+ i18n) | S | Low |
| 3 | Host test with ControlTower remote absent | S | Low |
| 2, 4 | Optional remote in compose and dev, docs | S | Low |
| 7 | Gateway-error message in `apiRequest` | S | Low (shared lib, adds one test) |
| 5 | Availability empty state in the remote | M | Low |
| 6 | Registry-level hide when unavailable | M | Contract change (additive) |
| C | Standalone ControlTower | L | High, product decision |

## Open questions

1. Is ControlTower meant to be an optional product add-on (then do Phases 1 to 3), or a required part of every install (then only items 1, 7 and 8 are worth doing)?
2. Does the ControlTower backend expose a health endpoint the frontend may call? `contracts/openapi.yaml` in `OpenJControlTower` should be checked before item 5.
3. Is a deployment without Cockpit's Keycloak (e.g. a different identity provider) ever expected? It is outside the scope above.
4. Should the CI stale-check for generated ControlTower types be allowed to skip when the ControlTower repository is not available (relevant to forks)?
