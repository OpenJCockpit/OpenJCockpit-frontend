# Build context is the repository root (see docker-compose.yml): the dashboard is an Nx workspace project.
FROM node:24-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8 AS manifests
# Collect every workspace package.json so a new lib needs no Dockerfile edit. This stage reruns on any
# source change, but its output layer is content-addressed, so the npm ci layer below stays cached
# until a manifest actually changes.
WORKDIR /src
COPY apps apps
COPY libs libs
COPY e2e e2e
RUN mkdir /manifests \
 && find apps libs e2e -name package.json -not -path '*/node_modules/*' | tar -cf - -T - | tar -xf - -C /manifests

FROM node:24-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8 AS build
WORKDIR /app
COPY package.json package-lock.json nx.json tsconfig.base.json vite.config.base.ts module-federation.shared.ts ./
COPY --from=manifests /manifests ./
RUN --mount=type=cache,target=/root/.npm npm ci --workspace=openjcockpit-frontend --include-workspace-root
COPY libs libs
COPY apps/dashboard apps/dashboard
RUN NX_DAEMON=false npx nx run dashboard:build

FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
# Pick up Alpine security patches published after the base image was built (the digest pin does not move on its own).
USER root
RUN apk upgrade --no-cache
USER 101
# The nginx image renders /etc/nginx/templates/*.template into /etc/nginx/conf.d at startup. The filter
# keeps envsubst from touching nginx's own $variables ($uri, $host, ...).
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA \
    API_UPSTREAM=http://ai-control-service:8080 \
    KEYCLOAK_URL=http://localhost:8080 \
    KEYCLOAK_REALM=openjcockpit \
    KEYCLOAK_CLIENT_ID=openjcockpit \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    REMOTE_HOST_PREFIX=remote- \
    REMOTE_PORT=8080 \
    FEDERATION_MANIFEST={} \
    FEDERATION_ALLOWED_ORIGINS_JSON=[] \
    FEDERATION_ALLOWED_ORIGINS= \
    NGINX_ENVSUBST_FILTER=^(KEYCLOAK_|FEDERATION_|REMOTE_|NGINX_LOCAL_RESOLVERS$|API_UPSTREAM$|BUILD_SHA$)
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY apps/dashboard/security-headers.inc.template /etc/nginx/templates/security-headers.inc.template
COPY deploy/tls/listen.inc.template /etc/nginx/templates/listen.inc.template
COPY --chmod=0755 deploy/tls/35-enable-tls.sh /docker-entrypoint.d/35-enable-tls.sh
# 8443 only listens when TLS_CERT_FILE and TLS_KEY_FILE are set (see deploy/tls/35-enable-tls.sh).
EXPOSE 8080 8443
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
