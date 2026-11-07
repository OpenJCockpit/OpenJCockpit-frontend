#!/usr/bin/env bash
# Trivy scan, the same one CI runs on pull requests, so findings can be fixed before pushing.
# Usage: scripts/trivy-scan.sh [fs|image|all]     (default: all)
#   fs     npm dependencies (package-lock.json) and Dockerfile misconfigurations. Fast, no docker build.
#   image  builds the dashboard and the four remote images and scans their OS packages and bundled files.
#   all    both
# Env: TRIVY_SEVERITY (default HIGH,CRITICAL). Unfixed vulnerabilities are ignored: nothing can be done about them.
# Uses a local `trivy` when installed, otherwise the pinned container (needs docker; image mode needs it anyway).
# Reproduce a CI failure for one finding with e.g.: scripts/trivy-scan.sh fs
set -euo pipefail
cd "$(dirname "$0")/.."

mode="${1:-all}"
severity="${TRIVY_SEVERITY:-HIGH,CRITICAL}"
trivy_image="aquasec/trivy:0.65.0@sha256:a22415a38938a56c379387a8163fcb0ce38b10ace73e593475d3658d578b2436"
cache="${TRIVY_CACHE_DIR:-${HOME}/.cache/trivy}"
mkdir -p "$cache"

case "$mode" in fs | image | all) ;; *) echo "usage: $0 [fs|image|all]" >&2; exit 2 ;; esac

run_trivy() {
  if command -v trivy >/dev/null 2>&1; then
    command trivy "$@"
  else
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock:ro -v "$PWD:/work:ro" -v "$cache:/root/.cache" \
      -w /work "$trivy_image" "$@"
  fi
}

failed=0
common=(--severity "$severity" --ignore-unfixed --exit-code 1 --no-progress)

if [ "$mode" = fs ] || [ "$mode" = all ]; then
  echo "== trivy fs (dependencies + Dockerfiles) =="
  run_trivy fs "${common[@]}" --scanners vuln,misconfig --skip-dirs node_modules,.nx,.git . || failed=1
fi

if [ "$mode" = image ] || [ "$mode" = all ]; then
  sha="$(git rev-parse HEAD 2>/dev/null || echo local)"
  build() { # name dockerfile [remote]
    local args=(--build-arg BUILD_SHA="$sha")
    [ -z "${3:-}" ] || args+=(--build-arg REMOTE="$3")
    docker build -q -f "$2" "${args[@]}" -t "trivy-scan-$1:local" . >/dev/null
  }
  echo "== building images =="
  build dashboard apps/dashboard/Dockerfile
  for r in skills-hub specs evidence quality; do build "remote-$r" deploy/remote/Dockerfile "remote-$r"; done
  for n in dashboard remote-skills-hub remote-specs remote-evidence remote-quality; do
    echo "== trivy image: $n =="
    run_trivy image "${common[@]}" "trivy-scan-$n:local" || failed=1
  done
fi

[ "$failed" = 0 ] && echo "trivy: clean" || { echo "trivy: findings above" >&2; exit 1; }
