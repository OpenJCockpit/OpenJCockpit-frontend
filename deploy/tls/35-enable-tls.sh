#!/bin/sh
# Optional TLS termination for the nginx images (dashboard and remotes).
#
# Runs from /docker-entrypoint.d/ after 20-envsubst-on-templates.sh has rendered conf.d/.
# Without TLS_CERT_FILE and TLS_KEY_FILE it does nothing and nginx serves plain HTTP on 8080.
# With both set (paths inside the container, typically a read-only mount) it:
#   - serves the site on 8443 over TLS,
#   - keeps 8080 for /healthz and redirects every other request there to https.
#
# The site's server block pulls its listener from conf.d/listen.inc (rendered from listen.inc.template as
# `listen 8080;`). This script replaces that one file and adds conf.d/tls-redirect.conf; it never edits default.conf.
#
#   TLS_CERT_FILE    certificate chain, PEM (leaf first, then intermediates)
#   TLS_KEY_FILE     private key, PEM
#   TLS_PUBLIC_PORT  port browsers use for https (default 443); only affects the 8080 -> https redirect
set -eu

CONF_DIR=/etc/nginx/conf.d

if [ -z "${TLS_CERT_FILE:-}" ] && [ -z "${TLS_KEY_FILE:-}" ]; then
  exit 0
fi

fail() { echo "35-enable-tls: $*" >&2; exit 1; }

[ -n "${TLS_CERT_FILE:-}" ] && [ -n "${TLS_KEY_FILE:-}" ] || fail "set both TLS_CERT_FILE and TLS_KEY_FILE"
[ -r "$TLS_CERT_FILE" ] || fail "TLS_CERT_FILE '$TLS_CERT_FILE' is not a readable file"
[ -r "$TLS_KEY_FILE" ] || fail "TLS_KEY_FILE '$TLS_KEY_FILE' is not a readable file"
[ -f "$CONF_DIR/listen.inc" ] || fail "$CONF_DIR/listen.inc not found (templates not rendered)"

case "${TLS_PUBLIC_PORT:-443}" in
  443) port_suffix="" ;;
  *[!0-9]*|"") fail "TLS_PUBLIC_PORT must be a number" ;;
  *) port_suffix=":${TLS_PUBLIC_PORT}" ;;
esac

cat > "$CONF_DIR/listen.inc" <<TLS
listen 8443 ssl;
ssl_certificate $TLS_CERT_FILE;
ssl_certificate_key $TLS_KEY_FILE;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_session_cache shared:SSL:5m;
ssl_session_timeout 1h;
TLS

# Plain port: container healthcheck plus redirect to https.
cat > "$CONF_DIR/tls-redirect.conf" <<PLAIN
server {
  listen 8080;
  server_name _;

  location = /healthz {
    access_log off;
    default_type text/plain;
    return 200 "ok\n";
  }

  location / {
    return 308 https://\$host${port_suffix}\$request_uri;
  }
}
PLAIN
echo "35-enable-tls: TLS enabled on 8443 (cert $TLS_CERT_FILE)"
