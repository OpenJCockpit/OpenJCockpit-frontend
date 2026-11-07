# One image per remote. Build context is the repository root:
#   docker build -f deploy/remote/Dockerfile --build-arg REMOTE=remote-skills-hub -t openjcockpit-remote-skills-hub .
FROM node:24-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8 AS manifests
WORKDIR /src
COPY apps apps
COPY libs libs
COPY e2e e2e
RUN mkdir /manifests \
 && find apps libs e2e -name package.json -not -path '*/node_modules/*' | tar -cf - -T - | tar -xf - -C /manifests

FROM node:24-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8 AS build
ARG REMOTE
RUN test -n "$REMOTE" || { echo "pass --build-arg REMOTE=<apps/ folder name>" >&2; exit 1; }
WORKDIR /app
COPY package.json package-lock.json nx.json tsconfig.base.json vite.config.base.ts module-federation.shared.ts ./
COPY --from=manifests /manifests ./
# All workspaces: the shared singletons (api, i18n, ui, hub-contract) must resolve even where this remote does not import them.
RUN --mount=type=cache,target=/root/.npm npm ci
COPY libs libs
COPY apps/$REMOTE apps/$REMOTE
# Served by the dashboard under /remotes/<name>/ (remote-specs -> /remotes/specs/), not on an origin of its own.
RUN REMOTE_BASE="/remotes/${REMOTE#remote-}/" NX_DAEMON=false npx nx run "$REMOTE":build

FROM nginxinc/nginx-unprivileged:1.27-alpine@sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0
ARG REMOTE
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA \
    NGINX_ENVSUBST_FILTER=^BUILD_SHA$
COPY --from=build /app/apps/$REMOTE/dist /usr/share/nginx/html
COPY deploy/remote/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
