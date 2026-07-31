#!/usr/bin/env bash
# Bundles the library once, then renders the README artwork from it.
set -euo pipefail
cd "$(dirname "$0")/.."
npx esbuild src/index.ts --bundle --platform=node --format=esm --outfile=.assets-lib.mjs >/dev/null
node scripts/assets.mjs
rm -f .assets-lib.mjs
