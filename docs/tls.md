# TLS for the dashboard image

The dashboard serves the remotes under `/remotes/<name>/`, so only the dashboard image needs TLS; the remote images
are internal and serve plain HTTP.

The dashboard nginx image can terminate TLS itself, the same way Keycloak takes a certificate
and key location. It is opt-in: without the variables below the images serve plain HTTP on 8080, exactly as before.

| Variable          | Meaning                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `TLS_CERT_FILE`   | Path **inside the container** to the certificate chain, PEM, leaf first            |
| `TLS_KEY_FILE`    | Path inside the container to the private key, PEM                                  |
| `TLS_PUBLIC_PORT` | Port browsers use for https (default `443`); only used for the 8080 -> https redirect |

When both `TLS_CERT_FILE` and `TLS_KEY_FILE` are set, `deploy/tls/35-enable-tls.sh` (an nginx entrypoint hook that
runs after the config templates are rendered; it replaces `conf.d/listen.inc` and adds `conf.d/tls-redirect.conf`, and never edits `default.conf`):

- serves the site on **8443** with TLS 1.2/1.3,
- keeps **8080** for `/healthz` (the container healthcheck) and answers every other request there with a `308`
  to `https://<host>[:TLS_PUBLIC_PORT]<path>`.

Setting only one of the two variables, or pointing at a file the container cannot read, makes the container exit at
startup with an explicit message instead of silently serving HTTP. The nginx user is non-root, so the mounted
files must be readable by others (key mode `0644`, or `0640` with a matching group); mount them read-only.

## Docker run

```sh
docker run -d -p 443:8443 \
  -v /etc/ssl/openjcockpit:/etc/nginx/tls:ro \
  -e TLS_CERT_FILE=/etc/nginx/tls/tls.crt \
  -e TLS_KEY_FILE=/etc/nginx/tls/tls.key \
  -e KEYCLOAK_URL=https://keycloak.example.com \
  -e API_UPSTREAM=http://ai-control-service:8080 \
  -e FEDERATION_MANIFEST='{"specs":"/remotes/specs/mf-manifest.json"}' \
  ghcr.io/openjcockpit/dashboard:vX.Y.Z
```

## Docker Compose

```sh
mkdir certs && cp fullchain.pem certs/tls.crt && cp privkey.pem certs/tls.key
PUBLIC_HOST=cockpit.example.com \
  docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build
```

The override publishes the dashboard on https `4443` and switches `KEYCLOAK_URL` to `https://$PUBLIC_HOST:8443`
(override it in `.env` if Keycloak is elsewhere). The remotes stay on plain HTTP inside the Compose network: the
dashboard serves them under `/remotes/<name>/`, so they need no certificate, port or CORS setting.

## Things that must also be https

A page served over TLS cannot call plain-http services (mixed content), so on a TLS instance:

- `KEYCLOAK_URL` is an `https://` URL, and the realm's redirect URIs and web origins include the dashboard's https origin.
- Every entry in `FEDERATION_MANIFEST` is `https://` or a same-origin path such as `/remotes/specs/mf-manifest.json`
  (the default); a remote on its own origin also needs that origin in `FEDERATION_ALLOWED_ORIGINS_JSON` and
  `FEDERATION_ALLOWED_ORIGINS`.
- The certificate covers the dashboard's hostname. With remotes under `/remotes/<name>/` that is the only one.
- `API_UPSTREAM` is server-side and may stay plain http on an internal network.

## Alternative: TLS in front

A reverse proxy (Caddy, Traefik, nginx on the host) can terminate TLS and forward to port 8080 instead; then none of
the `TLS_*` variables are needed. The "must also be https" rules above still apply to the public URLs.
