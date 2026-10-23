# solventa-front

- `web/`: Angular, portal de clientes y back-office. `cd web && npm install && npm start`.
- `mobile/`: Android (Kotlin + Compose), multi-módulo.
- `contracts/openapi/`: copia fijada de los OpenAPI de bff-web y bff-movil. Actualizar con `scripts/sync-contracts.sh <ref>`.

## Portal de gestión (back-office)

| Ruta | Grupo de Cognito | Qué hace |
| --- | --- | --- |
| `/ingresar`, `/recuperar` | — | Ingreso con Cognito (SRP, sin Hosted UI) y MFA TOTP obligatorio. El primer ingreso pide cambiar la contraseña temporal y registrar el autenticador (QR). |
| `/operacion/trazas` | `operacion` | Traza de un recorrido por correlationId (HU-W27). |
| `/operacion/alertas` | `operacion` | Alertas abiertas, umbrales configurados y resumen del mes (HU-W28). Los umbrales se cambian en `infra/envs/<env>/apps.tfvars` del repo back. |
| `/administracion/usuarios` | `administradores` | Alta de usuarios del back-office: Cognito les envía la contraseña temporal. |
| `/perfilamiento/nuevo` | `asesores` | Nueva cotización, paso 1: datos del cliente y **verificación de identidad** (HU-W30). El asesor crea el cliente (`POST /v1/clientes`) y lo verifica (`POST /v1/clientes/{id}/identidad/verificaciones`); "Continuar al perfilamiento" solo se habilita con identidad `VERIFICADO`. Si el proveedor no responde (503 `DEPENDENCIA_NO_DISPONIBLE`) queda `PENDIENTE` con "Reintentar"; `RECHAZADO` muestra un mensaje genérico. Tras el ingreso, el grupo `asesores` aterriza aquí. **HU-W03:** muestra la versión del producto y sus coberturas (`GET /v1/productos/vida-hipotecario/condiciones`); las opcionales se eligen con un interruptor y suman su recargo. "Validar los datos" revisa la suma asegurada, la edad y el plazo contra los límites de las reglas vigentes y deja el motivo junto a cada campo; "Cotizar sin perfilar" calcula la prima (`POST /v1/cotizaciones`) con el cliente ya registrado. |
| `/perfilamiento/:id` | `asesores` | Perfil de riesgo, recálculo y comparación (HU-W11, HU-W12). **HU-W03:** "Calcular la prima" cotiza con el nivel de este perfil y los datos con que se perfiló (se guardan solo en memoria: al recargar, el botón queda deshabilitado y pide volver a "Nueva cotización"). |
| `/perfilamiento/cotizaciones/:id` | `asesores` | **HU-W03:** prima calculada, su desglose (base, factores, recargos y ajuste a la prima mínima o máxima), la versión de las reglas y, recién calculada, los pasos con sus tiempos y el presupuesto consumido. **HU-W04 (C04):** la oferta: código legible (`COT-AAAA-NNNNN`), vigencia, coberturas con la parte de la suma asegurada que cubre cada una y exclusiones resumidas. **C08:** si la oferta venció (lo dice `cotizacion` o la fecha ya pasó), "Esta cotización ya no está vigente": los datos de la cotización vencida, la versión de las reglas vigente hoy (`GET /v1/productos/{id}/condiciones`) y "Recalcular ahora" hacia una nueva cotización; no ofrece continuar con la suscripción. |

Los grupos solo deciden qué se muestra; API Gateway valida el token y el BFF vuelve a exigir el grupo. El ID token se guarda en `sessionStorage` (la sesión termina al cerrar el navegador).

### Verificación de identidad: datos de prueba (backend local)

El proveedor KYC simulado decide por el número de documento (tipo `CC`): `1020456789` → `VERIFICADO` (referencia `kyc-doc-ref-0001`); `1000000002` → `RECHAZADO`; `1000000003`, `1000000004`, `1000000005` y cualquier otro → 503 y `PENDIENTE`.

## Correr en local

```bash
make instalar
make dev                       # http://localhost:4200, con public/config.json de desarrollo (sin Cognito)
make config-local ENV=int      # usa la API y el Cognito de int (requiere credenciales AWS); luego make dev
make config-restaurar          # antes de confirmar cambios
make test                      # Jasmine/Karma en Chrome headless
```

`public/config.json` define `apiBaseUrl`, `dashboardUrl` y `cognito.backoffice` (`userPoolId`, `clientId`). Son valores públicos. CORS de `bff-web` admite `http://localhost:4200`.

El front llama a `<apiBaseUrl>/web/...` (API Gateway quita `/web` y pone los encabezados de identidad a partir del token). El `bff-web` del docker compose del repo back (`http://localhost:8080`) atiende `/v1/...` sin ese prefijo y espera `X-Authenticated-Groups`/`X-Authenticated-Sub`, así que para usarlo directo desde el portal hace falta un proxy de desarrollo que quite `/web` e inyecte esos encabezados.

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
| `core:network` | Cliente del BFF móvil (Retrofit/OkHttp): `GET /v1/sesion` y `POST /v1/identidad/verificaciones`, con el mapeo de errores del contrato `bff-movil.yaml`. |
| `core:auth` | Sesión del cliente: ingreso SRP contra el pool `clientes` de Cognito (app client `mobile`), MFA TOTP opcional y restauración silenciosa de sesión (`GestorSesion`). |
| `core:security` | Desbloqueo biométrico (`BiometricPrompt`) y almacenamiento cifrado con Android Keystore de qué usuario puede restaurar sesión sin contraseña (HU-M07). |
| `core:designsystem` | Paleta, tema y componentes de Compose compartidos (logotipo, campo etiquetado, texto de advertencia). |
| `feature:login` | Pantalla de ingreso (credenciales + biometría), fiel a los mockups de HU-M07. |
| `feature:onboarding-identidad` | Registro y verificación de identidad (HU-M06): selfie y prueba de vida con CameraX + ML Kit, envío a `bff-movil` y resultados. La selfie vive solo en memoria. |
| `app` | Composición manual (sin Hilt) y punto de entrada. |

### Correr en local

1. Copie `mobile/local.properties.example` a `mobile/local.properties` (gitignored) y complete `cognitoPoolId`/`cognitoClientId` del pool `clientes` (app client `mobile`; ver `infra/platform/identity.tf` o `terraform output cognito` en el repo back). Sin esos valores la app arranca igual, pero el ingreso falla con un mensaje claro en vez de bloquearse. `bffMovilBaseUrl` ya trae por defecto `http://10.0.2.2:8081/` (cómo el emulador ve el `bff-movil` del docker compose del repo back).
2. Abra `mobile/` en Android Studio y corra el módulo `app`, o desde la terminal:
   ```bash
   cd mobile
   ./gradlew assembleDebug   # genera app/build/outputs/apk/debug/app-debug.apk
   ./gradlew test            # pruebas unitarias de todos los módulos
   ./gradlew lint            # MissingTranslation y HardcodedText son error en todos los módulos
   ./gradlew :feature:privacidad:koverVerify   # cobertura ≥ 80 % líneas / ≥ 75 % ramas
   ```
   Lo mismo corre `.github/workflows/ci-mobile.yml` en cada PR que toque `mobile/`. Toda cadena va en `values/strings.xml` (es-CO) y en `values-en-rUS/strings.xml` (en-US); una traducción faltante rompe el lint. `HardcodedText` solo revisa recursos XML: los literales dentro de Compose no los detecta.
3. El ingreso biométrico necesita un dispositivo/emulador con huella o rostro registrado en el sistema operativo y una sesión guardada (un ingreso previo con usuario/contraseña); si no hay ninguno, la app lo detecta y solo ofrece usuario/contraseña.
4. Tras el desbloqueo biométrico o el ingreso con credenciales, la app confirma la sesión contra `bff-movil` (`GET /v1/sesion`); sin el backend corriendo en local, verá el mensaje "No fue posible confirmar su sesión".

### Verificación de identidad contra el backend local (HU-M06)

Con el docker compose del repo back arriba (`bff-movil` en el puerto 8081), el flujo es: login → **Registrarme** → **Registrar mi biometría** → permiso de cámara → reto de vida → resultado. Solo en builds `debug`, `local.properties` permite ajustar dos valores; sin ellos la app usa por defecto `persona-de-prueba-1` y `selfie-sintetica-aprobada`, y funciona contra el backend local sin configurar nada:

- `subLocal`: el backend local identifica al titular por el encabezado `X-Authenticated-Sub` (cualquier texto único por persona de prueba). Admite una sola cuenta por titular: para repetir el registro use un valor nuevo. En AWS ese encabezado lo pone API Gateway a partir del token, y la app nunca lo envía.
- `selfieDePruebaLocal`: el simulador de KYC decide por el **texto** de la selfie y responde 503 ante una imagen real. Con este valor la app envía ese texto en lugar de la foto. Casos: `selfie-sintetica-aprobada` (200 `VERIFICADO`), `selfie-sintetica-captura-invalida` (200 `PENDIENTE`), `selfie-sintetica-rechazada` (200 `RECHAZADO`), `selfie-sintetica-caida` y `selfie-sintetica-lenta` (503). Cambie el valor y vuelva a compilar para probar cada caso.

Mientras se muestra la verificación la pantalla está protegida con `FLAG_SECURE`: las capturas de pantalla (incluida `adb screencap`) salen en negro.

### Creación de la cuenta (HU-M06)

Tras verificar la identidad, **Registrarme** hace SignUp en Cognito con el `tokenRegistro` en `ClientMetadata` (el Lambda pre sign-up lo valida contra el correo), pide el código enviado al correo, inicia sesión y vincula la cuenta con `POST /v1/registro/vinculacion`. Si el token falta, venció o es de otro correo, la app pide repetir la captura; si el correo ya tiene cuenta, lleva al ingreso. La contraseña solo se conserva en memoria hasta terminar.

Con `subLocal` (debug contra el backend local) no hay Cognito: la app valida el token con `POST /v1/registro/validaciones` (simula el pre sign-up) y vincula con el `sub` local. Contra AWS hace falta `cognitoPoolId`/`cognitoClientId` y que el pool tenga configurado el Lambda pre sign-up.

Para compilar con JDK 25 instalado, apunte `JAVA_HOME` a un JDK 17–21 (por ejemplo el JBR de Android Studio): Gradle 8.10 no soporta JDK 25.
