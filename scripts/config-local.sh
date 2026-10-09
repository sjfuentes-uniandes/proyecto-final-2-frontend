#!/usr/bin/env bash
# Escribe en web/public/config.json la configuración pública de un ambiente desplegado
# (API, Cognito del back-office y tablero) para correr el portal en local contra AWS.
# No lo confirme en Git: `make config-restaurar` devuelve el de desarrollo.
set -euo pipefail

ENV="${ENV:-int}"
AWS_REGION="${AWS_REGION:-us-east-1}"
NAME="${NAME:-solventa}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export AWS_REGION AWS_DEFAULT_REGION="${AWS_REGION}"

aws ssm get-parameter --name "/${NAME}/${ENV}/web/config" --query Parameter.Value --output text |
  jq '.config' >"${ROOT_DIR}/web/public/config.json"
echo "web/public/config.json apunta a ${ENV}. Ejecute 'make dev' y abra http://localhost:4200/ingresar"
echo "Al terminar: make config-restaurar (no confirme este archivo)."
