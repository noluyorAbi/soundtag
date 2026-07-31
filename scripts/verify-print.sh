#!/usr/bin/env bash
# Builds one tag per shape and asks a slicer what it thinks of them.
#
# This is the half of the verification that a test cannot do: whether the file
# a slicer reads is the file this project thinks it wrote. It needs Bambu
# Studio installed, so it exits 0 with a message when it is missing rather than
# failing a machine that cannot run it.
set -uo pipefail
cd "$(dirname "$0")/.."

STUDIO="/Applications/BambuStudio.app/Contents/MacOS/BambuStudio"
if [ ! -x "$STUDIO" ]; then
  echo "Bambu Studio is not installed at $STUDIO, so there is nothing to verify against."
  echo "The computational half of the same checks runs in npm test."
  exit 0
fi

out="$(mktemp -d)"
trap 'rm -rf "$out" result.json' EXIT

npm run build:cli >/dev/null 2>&1
fixture=test/fixtures/code-sweater-weather.svg
failed=0

for shape in bar coin card ornament magnet; do
  dir="$out/$shape"
  mkdir -p "$dir"
  node dist/soundtag.mjs 2QjOHCTQ1Jl3zawyYOpxh6 \
    --from-svg "$fixture" --shape "$shape" --title "Sweater Weather" \
    --format 3mf --out "$dir" >/dev/null || { echo "$shape: the build failed"; failed=1; continue; }

  file="$(find "$dir" -name '*.3mf' | head -1)"
  info="$("$STUDIO" --info "$file" 2>/dev/null)"
  manifold="$(echo "$info" | sed -n 's/^manifold = //p')"
  volume="$(echo "$info" | sed -n 's/^volume = //p')"

  if [ "$manifold" = "yes" ]; then
    printf '%-9s manifold, %s mm3\n' "$shape" "${volume%.*}"
  else
    printf '%-9s NOT manifold: %s\n' "$shape" "$(echo "$info" | grep non_manifold | tr '\n' ' ')"
    failed=1
  fi
done

# A round trip proves the slicer kept the part names and the filament ids.
node dist/soundtag.mjs 2QjOHCTQ1Jl3zawyYOpxh6 --from-svg "$fixture" --format 3mf --out "$out" >/dev/null
"$STUDIO" --export-3mf="$out/roundtrip.3mf" "$out"/*.3mf >/dev/null 2>&1
config="$(unzip -p "$out/roundtrip.3mf" Metadata/model_settings.config 2>/dev/null)"

for expected in 'value="Body"' 'value="Code"' 'key="extruder" value="2"' 'edges_fixed="0"' 'facets_reversed="0"'; do
  if echo "$config" | grep -q "$expected"; then
    echo "round trip kept $expected"
  else
    echo "round trip lost $expected"
    failed=1
  fi
done

exit $failed
