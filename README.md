# solventa-front

- `web/`: Angular, portal de clientes y back-office. `cd web && npm install && npm start`.
- `mobile/`: Android (Kotlin + Compose), multi-módulo.
- `contracts/openapi/`: copia fijada de los OpenAPI de bff-web y bff-movil. Actualizar con `scripts/sync-contracts.sh <ref>`.

## Portal de gestión (back-office)

| Ruta | Grupo de Cognito | Qué hace |
| --- | --- | --- |
| `/ingresar`, `/recuperar` | — | Ingreso con Cognito (SRP, sin Hosted UI) y MFA TOTP obligatorio. El primer ingreso pide cambiar la contraseña temporal y registrar el autenticador (QR). |
| `/operacion/trazas` | `operacion` | Traza de un recorrido por correlationId (HU-W27). |
| `/administracion/usuarios` | `administradores` | Alta de usuarios del back-office: Cognito les envía la contraseña temporal. |

Los grupos solo deciden qué se muestra; API Gateway valida el token y el BFF vuelve a exigir el grupo. El ID token se guarda en `sessionStorage` (la sesión termina al cerrar el navegador).

## Correr en local

```bash
make instalar
make dev                       # http://localhost:4200, con public/config.json de desarrollo (sin Cognito)
make config-local ENV=int      # usa la API y el Cognito de int (requiere credenciales AWS); luego make dev
make config-restaurar          # antes de confirmar cambios
make test                      # Jasmine/Karma en Chrome headless
```

`public/config.json` define `apiBaseUrl`, `dashboardUrl` y `cognito.backoffice` (`userPoolId`, `clientId`). Son valores públicos. CORS de `bff-web` admite `http://localhost:4200`.

## Desplegar en AWS

La infraestructura (bucket S3 privado, CloudFront y el parámetro SSM `/solventa/<ENV>/web/config`) la crea el repo back con `make infra-plataforma`.

```bash
make desplegar ENV=int         # compila, genera config.json desde SSM, sube a S3 e invalida CloudFront
```

- **CD web** (`.github/workflows/cd-web.yml`) hace lo mismo: en cada push a `main` despliega en `int`, y a mano en el ambiente elegido. Primero corre las pruebas y el build, y luego publica con `environment: <ambiente>`.
- **Configuración del repo en GitHub (una vez):**
  - Variables `AWS_WEB_ROLE_ARN` (salida `github_web_role_arn` de `make infra-bootstrap` en el repo back) y `AWS_REGION`.
  - El environment `int`.
- **Primer usuario:** se crea en el repo back con `EMAIL=... NOMBRE=... make infra-usuario-admin`. Los demás se crean desde Administración › Usuarios.
