# OpenJCockpit Frontend

The dashboard (host app) and its federated remotes for [OpenJCockpit](https://github.com/OpenJCockpit/OpenJCockpit).
React 19, Vite, Nx, Module Federation. The backend (Java services, Keycloak, LiteLLM, OPA, the REST contract)
lives in the separate backend repository; the two are developed, built and released independently and talk to each
other over HTTP.

## Layout

```text
apps/dashboard/       host app (nginx image: apps/dashboard/Dockerfile)
apps/remote-*/        federated remotes (nginx image: deploy/remote/Dockerfile)
libs/                 feature and shared libraries
e2e/                  Playwright suite (runs against a live backend)
docs/                 architecture, guidelines, mock server, hub-app integration guide, UI patterns
docker-compose.yml    dashboard + remotes in containers
```

## How the two repositories connect

Check both out side by side (the paths below are the defaults):

```text
OJC/
  OpenJCockpit/            backend: docker compose up -d --build
  OpenJCockpit-frontend/   this repository
```

The stacks are separate Compose projects that reach each other through ports published on the host:

| From | To | How |
| --- | --- | --- |
| dashboard container | `ai-control-service` | nginx proxies `/api` to `API_UPSTREAM` (default `http://host.docker.internal:9080`) |
| browser | Keycloak | `KEYCLOAK_URL` (default `http://localhost:8080`) |
| Vite dev server | `ai-control-service` | proxy `/api` to `http://localhost:9080` |
| browser | dashboard / remotes | `localhost:4000` / `4403`-`4406` |

Backend somewhere else? Copy `.env.example` to `.env` and override `API_UPSTREAM` / `KEYCLOAK_URL`.

## Running

```bash
# 1. backend (in ../OpenJCockpit)
docker compose up -d --build

# 2a. production-like: containers
docker compose up -d --build        # http://localhost:4000

# 2b. development: hot reload (stop the dashboard container first, both use port 4000)
npm install
npm run start:hub

# 2c. no backend at all: in-memory mock API with a stubbed login
npm run start:hub:mock
```

Port `4000` is a registered Keycloak redirect URI, so only one of 2a/2b can run at a time.

## Verification

```bash
npm ci
npm run check                                     # quick gate
npx nx run-many -t lint check-styles typecheck coverage build check-bundle   # what CI runs
```

### REST contract types

`libs/api/src/generated/contract.ts` is generated from the backend's `shared/contracts/openapi.yaml`. Locally it
is read from the sibling checkout `../OpenJCockpit`; set `OPENAPI_CONTRACT` to another path to override. After a
contract change in the backend, run `npx nx run api:generate` here and commit the result. CI fails when the
generated types are stale against the backend's `main` (repository variable `BACKEND_REF` selects another ref).

### End-to-end tests

`e2e/` drives a real backend. `npm run stack:reduced` (in `e2e/`) starts the backend's reduced stack from
`../../OpenJCockpit`; set `OJC_BACKEND_DIR` if the backend is checked out elsewhere. See `e2e/README.md`.

## CI and releases

- `ci.yml` -> `frontend-ci.yml` (lint, tests, build, image smoke tests) and `e2e-ci.yml`; the required check is `ci-summary`.
- CI checks the backend repository out for the contract and the e2e stack. If it is private, add a `CROSS_REPO_TOKEN`
  secret with read access to it (the default `GITHUB_TOKEN` cannot read other private repositories).
- Releases: push a `vX.Y.Z` tag; `release-images.yml` publishes `ghcr.io/openjcockpit/dashboard:vX.Y.Z`. The
  backend's deploy scripts use one tag for every image, so tag both repositories with the same version.
- Dependency updates: `renovate.yml` needs a `RENOVATE_TOKEN` secret.

More: [`docs/frontend-architecture.md`](docs/frontend-architecture.md), [`docs/frontend-guidelines.md`](docs/frontend-guidelines.md),
[`apps/dashboard/README.md`](apps/dashboard/README.md).

## Translations

User-facing copy goes through `t()` from `@openjcockpit/i18n`.

## License

Apache License 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
