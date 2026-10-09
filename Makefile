# Portal web (Angular). Despliegue sobre la infraestructura del repo back
# (infra/platform: bucket S3 + CloudFront + parámetro SSM /solventa/<ENV>/web/config).
#
#   make dev                         servidor local (http://localhost:4200)
#   make test / make build           pruebas (Chrome headless) y compilación de producción
#   make desplegar ENV=int           compila, publica en S3 e invalida CloudFront
#   make config-local ENV=int        usa la API y el Cognito de un ambiente desde local
#
# Variables: ENV (int), AWS_REGION (us-east-1), NAME (solventa), SKIP_BUILD=1.

ENV ?= int
AWS_REGION ?= us-east-1
NAME ?= solventa
export ENV AWS_REGION NAME

.PHONY: ayuda instalar dev test build desplegar config-local config-restaurar

ayuda: ## Lista los targets
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{ printf "  %-18s %s\n", $$1, $$2 }'

instalar: ## Dependencias (npm ci)
	cd web && npm ci

dev: ## Servidor de desarrollo
	cd web && npm start

test: ## Pruebas unitarias en Chrome headless
	cd web && npx ng test --watch=false --browsers=ChromeHeadless

build: ## Compilación de producción (web/dist/web/browser)
	cd web && npx ng build

desplegar: ## Publica el portal en ENV (requiere credenciales AWS)
	@scripts/desplegar-web.sh

config-local: ## web/public/config.json con la configuración pública de ENV
	@scripts/config-local.sh

config-restaurar: ## Vuelve al config.json de desarrollo
	git checkout -- web/public/config.json
