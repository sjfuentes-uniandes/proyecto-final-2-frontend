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

## Aplicación móvil (`mobile/`)

Android (Kotlin + Jetpack Compose), multi-módulo:

| Módulo | Qué hace |
| --- | --- |
| `core:network` | Cliente del BFF móvil (Retrofit/OkHttp): `GET /v1/sesion`, mapeo de errores del contrato `bff-movil.yaml`. |
| `core:auth` | Sesión del cliente: ingreso SRP contra el pool `clientes` de Cognito (app client `mobile`), MFA TOTP opcional y restauración silenciosa de sesión (`GestorSesion`). |
| `core:security` | Desbloqueo biométrico (`BiometricPrompt`) y almacenamiento cifrado con Android Keystore de qué usuario puede restaurar sesión sin contraseña (HU-M07). |
| `core:designsystem` | Paleta y tema de Compose compartidos. |
| `feature:login` | Pantalla de ingreso (credenciales + biometría), fiel a los mockups de HU-M07. |
| `app` | Composición manual (sin Hilt) y punto de entrada. |

### Correr en local

1. Copie `mobile/local.properties.example` a `mobile/local.properties` (gitignored) y complete `cognitoPoolId`/`cognitoClientId` del pool `clientes` (app client `mobile`; ver `infra/platform/identity.tf` o `terraform output cognito` en el repo back). Sin esos valores la app arranca igual, pero el ingreso falla con un mensaje claro en vez de bloquearse.
2. Abra `mobile/` en Android Studio y corra el módulo `app`, o desde la terminal:
   ```bash
   cd mobile
   ./gradlew assembleDebug   # genera app/build/outputs/apk/debug/app-debug.apk
   ./gradlew test            # pruebas unitarias de todos los módulos
   ```
3. El ingreso biométrico necesita un dispositivo/emulador con huella o rostro registrado en el sistema operativo; si no hay ninguno, la app lo detecta y solo ofrece usuario/contraseña.
