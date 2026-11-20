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
| `/consulta/polizas`, `/consulta/polizas/:polizaId` | `asesores` exclusivamente | Consulta del listado y detalle de pólizas (HU-W18). Sin este grupo no se muestran Pólizas ni Consulta; la URL directa lleva a `/sin-acceso` y no solicita datos de pólizas. Los suscriptores conservan su acceso a Contratación, no a la consulta. No afecta la consulta de pólizas propias en móvil. |
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

La navegación móvil respeta los márgenes de las barras del sistema para mantener los controles, incluido Cerrar sesión, fuera de la barra de estado y del área de navegación de Android.

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

### Reporte de siniestros (HU-M01)

El selector de un nuevo reporte muestra solo pólizas del titular con `estado = ACTIVA` y `vigente = true` cuya vigencia incluye la fecha actual en Colombia (ambos extremos incluidos), tanto en el listado como en el detalle de la póliza. Si no se puede confirmar el detalle, la póliza no se ofrece y se permite reintentar la consulta. Android vuelve a comprobar la fecha antes de crear el borrador; el backend valida la elegibilidad y la titularidad. Desde el detalle de un borrador abierto también se pueden agregar evidencias al mismo reporte, hasta el límite publicado por el servicio.

El detalle de un siniestro enviado muestra el número de la póliza asociada en «Información del reporte», separado del radicado. Si no se puede consultar la póliza, el resto del detalle sigue disponible y se puede reintentar con el botón de actualizar.

Las evidencias del caso definitivo tienen acciones **Ver** y **Descargar**. Cada uso solicita `POST /v1/siniestros/{siniestroId}/evidencias/{evidenciaId}/enlace` sin cuerpo ni `clienteId`, descarga el archivo con un cliente HTTP independiente (sin token del BFF) y conserva nombre/MIME. **Ver** concede acceso temporal mediante `FileProvider` al visor instalado; **Descargar** permite elegir destino con el selector de archivos de Android, sin permisos generales de almacenamiento. Los enlaces no se guardan ni se registran; una firma vencida se renueva como máximo una vez. Requiere desplegar el endpoint en `int` para validar contra AWS.

El reporte requiere una descripción obligatoria (no vacía ni compuesta solo por espacios), seleccionar el **código** de una cobertura de la póliza, indicar la fecha y hora real del evento con zona horaria y adjuntar al menos una evidencia. Android guarda descripción, causa y fecha mediante `PATCH` antes de enviar; todas las evidencias deben quedar confirmadas. Al abrir un reporte nuevo, la fecha y hora se precargan con las del sistema, incluido el desplazamiento horario, y se pueden corregir. No se reemplazan por la hora del envío ni se sobrescribe la fecha guardada de un borrador.

Además de la cámara, **Adjuntar archivo** abre el selector de Android sin permisos generales de almacenamiento. Permite seleccionar cualquier tipo para informar el rechazo, pero solo incorpora JPEG, PNG y MP4 habilitados por los límites del backend. La copia privada se limita durante la lectura; se valida el contenido y la duración real del video. Se conserva el nombre sin usarlo como ruta y no se inventa una fecha de captura. Al superar la cantidad, tamaño o duración permitidos se informa el límite y no se agrega el archivo.

Si el botón de envío está deshabilitado, el formulario indica los requisitos que faltan. Cancelar la explicación de ubicación no constituye un rechazo del permiso ni bloquea el envío cuando la ubicación es opcional; sin una lectura registrada, el reporte conserva `ubicacion: null`.

La app llama a `POST /v1/siniestros/borradores/{borradorId}/envio` sin cuerpo, con una UUID estable derivada de la operación y el ID del borrador. Así, al reabrir el mismo borrador se conserva la clave de envío, incluso después de reiniciar la app. Antes de reintentar consulta si ya está `CONVERTIDO` y recupera `envio`; solo una confirmación del servidor muestra el radicado. La pantalla separa **Pendientes** de **Enviados**, pagina el historial definitivo y consulta el estado actual del siniestro. Los borradores abiertos pueden corregirse y sus evidencias pendientes quitarse para volver a capturarlas sin crear otro reporte.

Al solicitar guardar o enviar, la app conserva primero una versión local cifrada del formulario y sus evidencias con una clave de Android Keystore, vinculada al titular y excluida de las copias de seguridad. Si falla la conexión, queda disponible en **Pendientes** después de volver a conectarse e iniciar sesión; el usuario debe abrirla y reintentar manualmente, no se envía en segundo plano. Los cambios posteriores a esa versión no se guardan automáticamente. La captura y la carga utilizan archivos temporales en la caché privada de la aplicación; la copia persistente del pendiente está cifrada. La desinstalación o el borrado de datos elimina los pendientes locales.

#### Ubicación autorizada del reporte (M1.1)

La sección **Ubicación del reporte** explica el uso antes de solicitar los permisos de primer plano. Usa Google Play Services Location para obtener coordenadas WGS84, precisión horizontal y fecha real de la lectura; la fecha del evento no cambia. No modifica fotos, videos, EXIF ni checksums, no solicita ubicación en segundo plano y cancela la captura al salir de primer plano. No registra coordenadas en logs.

Las reglas provienen de `GET /v1/siniestros/limites`: `ubicacionObligatoria`, excepciones por **código de causa** en `ubicacionTiposOpcionales` y umbral inclusivo `ubicacionPrecisionMaxM`. No hay un umbral operativo fijo en Android. Sin reglas válidas se muestra error/reintento y no se permite enviar. Un permiso aproximado se evalúa por la precisión real, no se rechaza automáticamente.

La lectura se guarda con `PATCH /v1/siniestros/borradores/{borradorId}` en el mismo borrador, sin `clienteId` ni `estado` en la solicitud. Solo la respuesta confirma el guardado y su estado: disponible, no confiable o no disponible. El formulario y los detalles muestran latitud y longitud cuando están registradas, con hasta siete decimales para visualización; los valores guardados no se modifican. Ante rechazo, revocación o ausencia de lectura se envía únicamente el permiso, reemplazando las coordenadas anteriores. Los datos antiguos con `ubicacion: null` se presentan sin ubicación registrada. Un fallo de PATCH conserva la lectura pendiente en memoria y ofrece reintento; al guardar o enviar también se incluye en la versión local cifrada. No se simula un guardado exitoso en el servidor.

**Guardar borrador y evidencias** conserva el trabajo aunque falte ubicación confiable. El envío exige una ubicación confirmada y dentro del umbral cuando la causa la requiere, además de las validaciones del reporte. Un `422` de ubicación se muestra en esta sección y permite corregir y enviar el mismo borrador con la misma clave, sin repetir evidencias confirmadas. El rechazo permanente ofrece una acción explícita a los ajustes de Android.

Las pruebas locales usan lecturas sintéticas, Robolectric y MockWebServer (herramienta HTTP ya usada por el proyecto). La validación integral R4 requiere desplegar los cambios compatibles de `bff-movil` y `siniestros` en `int`; después deben verificarse envío/recuperación y lectura en exterior e interior en un dispositivo físico. La comprobación manual con TalkBack y la fidelidad respecto de los mockups de ubicación también quedan pendientes; la prueba con fuente al 200 % no sustituye esas verificaciones.

### Verificación de identidad contra el backend local (HU-M06)

Con el docker compose del repo back arriba (`bff-movil` en el puerto 8081), el flujo es: login → **Registrarme** → **Registrar mi biometría** → permiso de cámara → reto de vida → resultado. Solo en builds `debug`, `local.properties` permite ajustar dos valores; sin ellos la app usa por defecto `persona-de-prueba-1` y `selfie-sintetica-aprobada`, y funciona contra el backend local sin configurar nada:

- `subLocal`: el backend local identifica al titular por el encabezado `X-Authenticated-Sub` (cualquier texto único por persona de prueba). Admite una sola cuenta por titular: para repetir el registro use un valor nuevo. En AWS ese encabezado lo pone API Gateway a partir del token, y la app nunca lo envía.
- `selfieDePruebaLocal`: el simulador de KYC decide por el **texto** de la selfie y responde 503 ante una imagen real. Con este valor la app envía ese texto en lugar de la foto. Casos: `selfie-sintetica-aprobada` (200 `VERIFICADO`), `selfie-sintetica-captura-invalida` (200 `PENDIENTE`), `selfie-sintetica-rechazada` (200 `RECHAZADO`), `selfie-sintetica-caida` y `selfie-sintetica-lenta` (503). Cambie el valor y vuelva a compilar para probar cada caso.

Mientras se muestra la verificación la pantalla está protegida con `FLAG_SECURE`: las capturas de pantalla (incluida `adb screencap`) salen en negro.

### Creación de la cuenta (HU-M06)

El backend busca al cliente dado de alta por el asesor por **tipo y número de documento**, sin exigir que el correo coincida con el informado por el asesor. La app solicita un correo válido y accesible para crear y confirmar la cuenta. Desde el primer intento de verificación, el registro y su token quedan ligados a ese correo: para reintentar un registro ya iniciado debe mantenerse el mismo correo.

Tras verificar la identidad, **Registrarme** hace SignUp en Cognito con el `tokenRegistro` en `ClientMetadata` (el Lambda pre sign-up lo valida contra el correo), pide el código enviado al correo, inicia sesión y vincula la cuenta con `POST /v1/registro/vinculacion`. Si el token falta, venció o es de otro correo, la app pide repetir la captura; si el correo ya tiene cuenta, lleva al ingreso. La contraseña solo se conserva en memoria hasta terminar.

Solo `SignUp` usa un tiempo de espera de lectura de 30 s. La conexión, la confirmación, el reenvío y el ingreso conservan los tiempos predeterminados del SDK. Este ajuste no modifica el límite del Lambda pre sign-up.

Con `subLocal` (debug contra el backend local) no hay Cognito: la app valida el token con `POST /v1/registro/validaciones` (simula el pre sign-up) y vincula con el `sub` local. Contra AWS hace falta `cognitoPoolId`/`cognitoClientId` y que el pool tenga configurado el Lambda pre sign-up.

Para compilar con JDK 25 instalado, apunte `JAVA_HOME` a un JDK 17–21 (por ejemplo el JBR de Android Studio): Gradle 8.10 no soporta JDK 25.
