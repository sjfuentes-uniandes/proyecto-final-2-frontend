#!/usr/bin/env bash

set -euo pipefail

ENV="${ENV:-int}"
AWS_REGION="${AWS_REGION:-us-east-1}"
NAME="${NAME:-solventa}"
SKIP_BUILD="${SKIP_BUILD:-0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="${ROOT_DIR}/web"
DIST_DIR="${WEB_DIR}/dist/web/browser"
PARAM="/${NAME}/${ENV}/web/config"
export AWS_REGION AWS_DEFAULT_REGION="${AWS_REGION}"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m[error] %s\033[0m\n' "$*" >&2; exit 1; }
for tool in aws jq npm; do command -v "${tool}" >/dev/null 2>&1 || die "Falta ${tool} en el PATH."; done

log "Configuración del ambiente ${ENV} (${PARAM})"
web=$(aws ssm get-parameter --name "${PARAM}" --query Parameter.Value --output text 2>/dev/null) ||
  die "No se pudo leer ${PARAM}. ¿Existe la plataforma del ambiente (make infra-plataforma en el repo back) y hay credenciales?"
bucket=$(jq -r '.bucket' <<<"${web}")
distribucion=$(jq -r '.distributionId' <<<"${web}")
url=$(jq -r '.url' <<<"${web}")
echo "  bucket: ${bucket}  distribución: ${distribucion}  portal: ${url}"

if [ "${SKIP_BUILD}" != "1" ]; then
  log "Compilación"
  (cd "${WEB_DIR}" && npm ci --no-audit --no-fund && npx ng build)
fi
[ -f "${DIST_DIR}/index.html" ] || die "No existe ${DIST_DIR}/index.html; compile primero (sin SKIP_BUILD)."

# El config.json del repo es el de desarrollo; el del ambiente sale de SSM.
jq '.config' <<<"${web}" >"${DIST_DIR}/config.json"

log "Publicación en s3://${bucket}"
# Primero los archivos con hash (inmutables) y después los de entrada, para que
# index.html nunca apunte a archivos que todavía no existen.
aws s3 sync "${DIST_DIR}" "s3://${bucket}" --delete --only-show-errors \
  --exclude index.html --exclude config.json \
  --cache-control "public, max-age=31536000, immutable"
for archivo in index.html config.json; do
  aws s3 cp "${DIST_DIR}/${archivo}" "s3://${bucket}/${archivo}" --only-show-errors \
    --cache-control "no-cache, no-store, must-revalidate"
done

log "Invalidación de CloudFront"
aws cloudfront create-invalidation --distribution-id "${distribucion}" \
  --paths "/index.html" "/config.json" --query Invalidation.Id --output text

log "Listo: ${url}/ingresar"
