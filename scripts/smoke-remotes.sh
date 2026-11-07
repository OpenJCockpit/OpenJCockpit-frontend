#!/usr/bin/env bash
# Checks that every remote the dashboard advertises is reachable through the dashboard's own origin:
# the manifest from /federation.manifest.json, each remote's mf-manifest.json and remoteEntry.js, and every JS and
# CSS asset the manifest lists. Fails on any non-200 response or a request that leaves the dashboard's origin.
# Usage: scripts/smoke-remotes.sh <dashboard-base-url>      e.g. scripts/smoke-remotes.sh http://localhost:4000
# Needs curl and jq.
set -euo pipefail

base="${1:?usage: $0 <dashboard-base-url>}"
base="${base%/}"
fail=0

check() {
  local code
  code="$(curl -sk -o /dev/null -w '%{http_code}' "$1")"
  [ "$code" = 200 ] || { echo "FAIL $code $1"; fail=1; }
}

manifest="$(curl -fsSk "$base/federation.manifest.json")"
[ "$(jq 'length' <<<"$manifest")" -gt 0 ] || { echo "federation.manifest.json lists no remotes"; exit 1; }

while IFS=$'\t' read -r name entry; do
  case "$entry" in
    /*) url="$base$entry" ;;
    "$base"/*) url="$entry" ;;
    *) echo "FAIL $name: $entry is not on the dashboard origin"; fail=1; continue ;;
  esac
  dir="${url%/*}"
  mf="$(curl -fsSk "$url")" || { echo "FAIL $name: cannot fetch $url"; fail=1; continue; }
  public="$(jq -r '.metaData.publicPath' <<<"$mf")"
  [ "$public" = "${dir#"$base"}/" ] || { echo "FAIL $name: publicPath '$public' does not match ${dir#"$base"}/"; fail=1; }
  check "$dir/remoteEntry.js"
  count=0
  while read -r asset; do
    check "$dir/$asset"
    count=$((count + 1))
  done < <(jq -r '[.exposes[].assets, .shared[].assets | .js, .css | .sync[]?, .async[]?] | unique[]' <<<"$mf")
  echo "$name: manifest, remoteEntry.js and $count assets checked"
done < <(jq -r 'to_entries[] | [.key, .value] | @tsv' <<<"$manifest")

exit "$fail"
