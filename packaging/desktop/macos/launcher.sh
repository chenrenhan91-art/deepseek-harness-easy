#!/bin/sh
# Resolve the pack root from this .app, never from a developer checkout path.
set -eu
contents="$(cd "$(dirname "$0")/.." && pwd)"
runtime="$contents/Resources/runtime"
arch="$(uname -m)"
if [ "$arch" = "arm64" ]; then
  node="$runtime/node-darwin-arm64/bin/node"
else
  node="$runtime/node-darwin-x64/bin/node"
fi
if [ ! -x "$node" ]; then
  echo "dsh desktop: bundled Node missing at $node" >&2
  exit 1
fi
export DSH_DESKTOP_RUNTIME="$runtime"
exec "$node" "$runtime/launch.mjs"
