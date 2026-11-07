#!/usr/bin/env bash
# Smoke-test a built nginx image over plain HTTP, and over TLS when the second argument is `tls` (the dashboard
# terminates TLS; the remote images do not).
# Usage: scripts/smoke-image.sh <image-ref> [tls]     e.g. scripts/smoke-image.sh ghcr.io/org/dashboard:v1.0.0 tls
# Needs docker and curl (plus openssl for tls); uses host ports 18080, 18081 and 18443.
set -euo pipefail

image="${1:?usage: $0 <image-ref> [tls]}"
tls="${2:-}"
certs=""
cleanup() { docker rm -f smoke-plain smoke-tls >/dev/null 2>&1 || true; [ -z "$certs" ] || rm -rf "$certs"; }
trap cleanup EXIT

# Placeholder values satisfy the dashboard's envsubst; the remotes ignore them.
common=(-e API_UPSTREAM=http://127.0.0.1:1 -e KEYCLOAK_URL=https://keycloak.test -e FEDERATION_MANIFEST='{}'
        -e FEDERATION_ALLOWED_ORIGINS_JSON='[]' -e FEDERATION_ALLOWED_ORIGINS=)
wait_for() { for _ in $(seq 20); do curl -fsk "$1" >/dev/null 2>&1 && return 0; sleep 1; done; docker logs "$2"; return 1; }

docker run -d --name smoke-plain -p 18080:8080 "${common[@]}" "$image" >/dev/null
wait_for http://127.0.0.1:18080/healthz smoke-plain
docker rm -f smoke-plain >/dev/null

[ "$tls" = tls ] || { echo "smoke OK: $image"; exit 0; }

certs="$(mktemp -d)"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=localhost -keyout "$certs/tls.key" -out "$certs/tls.crt" 2>/dev/null
chmod 755 "$certs"; chmod 644 "$certs"/*
docker run -d --name smoke-tls -p 18081:8080 -p 18443:8443 -v "$certs:/etc/nginx/tls:ro" "${common[@]}" \
  -e TLS_CERT_FILE=/etc/nginx/tls/tls.crt -e TLS_KEY_FILE=/etc/nginx/tls/tls.key -e TLS_PUBLIC_PORT=18443 \
  "$image" >/dev/null
wait_for https://127.0.0.1:18443/healthz smoke-tls
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/x)" = 308 ] || { echo "::error::no http->https redirect"; exit 1; }
echo "smoke OK: $image"
