#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="docs/architecture/diagrams"
mkdir -p "$OUT_DIR"

# name:page-index pairs, in the order pages appear in system-architecture.drawio.
# NOTE: rlespinasse/drawio-desktop-headless's --page-index is 1-indexed (page 1
# is the first page), NOT 0-indexed like the <diagram> declaration order in the
# .drawio XML. Empirically verified 2026-07-12 by extracting each exported
# SVG's embedded title and comparing to the source page order -- a 0-indexed
# array here silently exported every page shifted by one (aws-infra.svg showed
# Full Architecture, request-lifecycle.svg showed AWS Infrastructure, etc.,
# with only full-arch.svg accidentally correct because index 0 was clamped to
# page 1 by the tool). Do not "fix" this back to 0-indexed without re-running
# the empirical check below.
PAGES=(
  "full-arch:1"
  "aws-infra:2"
  "request-lifecycle:3"
  "auth-flow:4"
  "deploy-pipeline:5"
  "aws-network:6"
  "er-diagram:7"
  "reg-onboarding:8"
)

for entry in "${PAGES[@]}"; do
  name="${entry%%:*}"
  index="${entry##*:}"
  echo "Exporting page $index -> $OUT_DIR/$name.svg"
  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$(pwd)/docs/architecture:/data" \
    rlespinasse/drawio-desktop-headless \
    -x -f svg -o "/data/diagrams/$name.svg" --page-index "$index" \
    /data/system-architecture.drawio
done

echo "Done. Exported ${#PAGES[@]} pages to $OUT_DIR/"
