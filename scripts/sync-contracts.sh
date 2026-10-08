#!/usr/bin/env bash
# Trae los OpenAPI de bff-web y bff-movil desde una versión (tag o commit) del repo back.
# Uso: scripts/sync-contracts.sh <ref>
set -euo pipefail

REF="${1:?Uso: $0 <tag-o-commit-del-repo-back>}"
REPO="${BACK_REPO:-git@github.com:sjfuentes-uniandes/proyecto-final-2-backend.git}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/contracts/openapi"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --quiet --depth 1 --branch "$REF" "$REPO" "$TMP" 2>/dev/null \
  || { git clone --quiet "$REPO" "$TMP" && git -C "$TMP" checkout --quiet "$REF"; }

for f in bff-web.yaml bff-movil.yaml; do
  cp "$TMP/contracts/openapi/$f" "$DEST/$f"
done
echo "$REF" > "$DEST/VERSION"
echo "Contratos sincronizados con $REF"
