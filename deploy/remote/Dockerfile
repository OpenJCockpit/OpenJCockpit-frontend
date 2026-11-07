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

FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
# Pick up Alpine security patches published after the base image was built (the digest pin does not move on its own).
USER root
RUN apk upgrade --no-cache
USER 101
ARG REMOTE
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA \
    NGINX_ENVSUBST_FILTER=^BUILD_SHA$
COPY --from=build /app/apps/$REMOTE/dist /usr/share/nginx/html
COPY deploy/remote/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
