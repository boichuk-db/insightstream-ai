#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="docs/architecture/diagrams"
mkdir -p "$OUT_DIR"

# name:page-index pairs, in the order pages appear in system-architecture.drawio
PAGES=(
  "full-arch:0"
  "aws-infra:1"
  "request-lifecycle:2"
  "auth-flow:3"
  "deploy-pipeline:4"
  "aws-network:5"
  "er-diagram:6"
  "reg-onboarding:7"
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
