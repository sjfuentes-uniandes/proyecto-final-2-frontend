package com.solventa.app

import android.app.Application
import com.solventa.core.auth.AlmacenSesionSegura
import com.solventa.core.auth.ClienteIdentidad
import com.solventa.core.auth.ClienteRegistro
import com.solventa.core.auth.CognitoClienteIdentidad
import com.solventa.core.auth.CognitoClienteRegistro
import com.solventa.core.auth.ConfiguracionCognito
import com.solventa.core.auth.EstadoSesion
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.auth.ResultadoConfirmacion
import com.solventa.core.auth.ResultadoRegistroCuenta
import com.solventa.core.auth.ResultadoReenvioCodigo
import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.ConsentimientosCliente
import com.solventa.core.network.RedModule
import com.solventa.core.network.RegistroCliente
import com.solventa.core.security.AlmacenSesionSeguraKeystore
import com.solventa.core.security.GestorBiometria
import com.solventa.feature.billetera.datos.RepositorioPolizasRed
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.privacidad.biometria.VerificadorBiometricoPrompt
import com.solventa.feature.privacidad.datos.RepositorioConsentimientosRed
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.notificaciones.AlmacenDispositivo
import com.solventa.feature.notificaciones.AlmacenDispositivoCifrado
import com.solventa.feature.notificaciones.ConfiguracionFirebase
import com.solventa.feature.notificaciones.DependenciasNotificaciones
import com.solventa.feature.notificaciones.GestorDispositivo
import com.solventa.feature.notificaciones.InicializadorFirebase
import com.solventa.feature.notificaciones.ProveedorTokenPush
import com.solventa.feature.notificaciones.RedDispositivosBff
import com.solventa.feature.notificaciones.ui.RegistroExplicacionPermisoPreferencias
import com.solventa.feature.onboardingidentidad.verificacion.CrearCuenta
import com.solventa.feature.onboardingidentidad.verificacion.SesionRegistro
import com.solventa.feature.onboardingidentidad.verificacion.VerificarIdentidad
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Punto de arranque de la app y raíz de composición (DI manual: no hay Hilt/Koin en el proyecto).
 * Expone las piezas ya cableadas para que las Activities/ViewModels las tomen de aquí.
 */
open class SolventaApp : Application(), DependenciasNotificaciones {
    lateinit var gestorSesion: GestorSesion
        private set
    lateinit var gestorBiometria: GestorBiometria
        private set
    lateinit var bffMovilCliente: BffMovilCliente
        private set
    lateinit var repositorioConsentimientos: RepositorioConsentimientos
        private set
    lateinit var repositorioPolizas: RepositorioPolizas
        private set
    /** Uno por proceso: la actividad en pantalla se adjunta al crearse y se suelta al destruirse. */
    lateinit var verificadorBiometrico: VerificadorBiometricoPrompt
        private set
    lateinit var verificarIdentidad: VerificarIdentidad
        private set
    lateinit var crearCuenta: CrearCuenta
        private set

    /** Estado del registro en curso; vive aquí para sobrevivir a las pantallas del registro. */
    val sesionRegistro = SesionRegistro()

    /** Scope de aplicación (SupervisorJob): registro y baja del dispositivo no dependen de ninguna pantalla. */
    override val ambitoApp: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    final override lateinit var gestorDispositivo: GestorDispositivo
        private set
    val destinoPendiente = DestinoPendiente()
    lateinit var registroPermisoNotificaciones: RegistroExplicacionPermisoPreferencias
        private set

    /** Punto de extensión para las pruebas: sin valores, Firebase queda sin configurar. */
    internal open fun configuracionFirebase() = ConfiguracionFirebase(
        apiKey = BuildConfig.FIREBASE_API_KEY,
        appId = BuildConfig.FIREBASE_APP_ID,
        projectId = BuildConfig.FIREBASE_PROJECT_ID,
        senderId = BuildConfig.FIREBASE_SENDER_ID,
    )

    internal open fun urlBaseBff(): String = BuildConfig.BFF_MOVIL_BASE_URL

    internal open fun crearAlmacenSesion(): AlmacenSesionSegura = AlmacenSesionSeguraKeystore(this)

    internal open fun crearAlmacenDispositivo(): AlmacenDispositivo = AlmacenDispositivoCifrado(this)

    internal open fun crearProveedorTokenPush(): ProveedorTokenPush =
        InicializadorFirebase.inicializar(this, configuracionFirebase())

    override fun onCreate() {
        super.onCreate()

        gestorBiometria = GestorBiometria(this)

        val almacenSesionSegura = crearAlmacenSesion()
        // La baja del dispositivo se lanza con el token ya capturado y sin esperar: cerrar sesión no se bloquea.
        gestorSesion = GestorSesion(
            crearClienteIdentidad(),
            almacenSesionSegura,
            antesDeCerrarSesion = { token -> ambitoApp.launch { gestorDispositivo.darDeBaja(token) } },
        )

        // Los valores de desarrollo local solo se aplican en debug, aunque en release ya vienen vacíos.
        val subLocal = BuildConfig.SUB_LOCAL.takeIf { BuildConfig.DEBUG && it.isNotBlank() }
        val api = RedModule.crearApi(urlBaseBff(), subLocal = subLocal, proveedorAccessToken = gestorSesion)
        bffMovilCliente = BffMovilCliente(api)
        repositorioConsentimientos = RepositorioConsentimientosRed(ConsentimientosCliente(api))
        repositorioPolizas = RepositorioPolizasRed(bffMovilCliente)
        verificadorBiometrico = VerificadorBiometricoPrompt(gestorBiometria)
        verificarIdentidad = VerificarIdentidad(
            cliente = RegistroCliente(api),
            sesion = sesionRegistro,
            selfieDePruebaLocal = BuildConfig.SELFIE_DE_PRUEBA_LOCAL.takeIf { BuildConfig.DEBUG && it.isNotBlank() },
        )
        crearCuenta = CrearCuenta(
            clienteRegistro = crearClienteRegistro(),
            gestorSesion = gestorSesion,
            registroCliente = RegistroCliente(api),
            sesion = sesionRegistro,
            // Backend local: no hay Cognito; /validaciones simula el pre sign-up y el sub local autentica.
            modoLocal = subLocal != null,
        )

        // Sin configuración de Firebase el proveedor es un no-op y la app arranca igual.
        gestorDispositivo = GestorDispositivo(
            red = RedDispositivosBff(bffMovilCliente),
            proveedorToken = crearProveedorTokenPush(),
                        almacen = crearAlmacenDispositivo(),
            tokenSesion = gestorSesion::actual,
        )
        registroPermisoNotificaciones = RegistroExplicacionPermisoPreferencias(this)
        ambitoApp.launch {
            gestorSesion.estado.collect { estado ->
                if (estado is EstadoSesion.Autenticada) gestorDispositivo.registrar()
            }
        }
    }

    private fun crearClienteRegistro(): ClienteRegistro {
        val configuracion = ConfiguracionCognito(
            poolId = BuildConfig.COGNITO_POOL_ID,
            clientId = BuildConfig.COGNITO_CLIENT_ID,
            region = BuildConfig.COGNITO_REGION,
        )
        if (configuracion.poolId.isBlank() || configuracion.clientId.isBlank()) return ClienteRegistroSinConfigurar
        return CognitoClienteRegistro(this, configuracion)
    }

    internal open fun crearClienteIdentidad(): ClienteIdentidad {
        val configuracion = ConfiguracionCognito(
            poolId = BuildConfig.COGNITO_POOL_ID,
            clientId = BuildConfig.COGNITO_CLIENT_ID,
            region = BuildConfig.COGNITO_REGION,
        )
        if (configuracion.poolId.isBlank() || configuracion.clientId.isBlank()) {
            // local.properties aún no tiene cognitoPoolId/cognitoClientId (ver
            // local.properties.example): se evita romper el arranque de la app y se deja un
            // cliente que siempre informa el problema de configuración con claridad.
            return ClienteIdentidadSinConfigurar
        }
        return CognitoClienteIdentidad(this, configuracion)
    }
}

private object ClienteRegistroSinConfigurar : ClienteRegistro {
    override suspend fun registrar(correo: String, contrasena: String, tokenRegistro: String) =
        ResultadoRegistroCuenta.ErrorDesconocido("Falta configurar Cognito en local.properties")

    override suspend fun confirmar(correo: String, codigo: String) =
        ResultadoConfirmacion.ErrorDesconocido("Falta configurar Cognito en local.properties")

    override suspend fun reenviarCodigo(correo: String) =
        ResultadoReenvioCodigo.ErrorDesconocido("Falta configurar Cognito en local.properties")
}

private object ClienteIdentidadSinConfigurar : ClienteIdentidad {
    private val error = ResultadoAutenticacion.ErrorDesconocido(
        "Falta configurar Cognito en local.properties (cognitoPoolId/cognitoClientId)",
    )

    override suspend fun autenticar(usuario: String, contrasena: String) = error

    override suspend fun confirmarCodigoMfa(codigo: String) = error

    override suspend fun restaurarSesion(usuario: String) = error

    override fun cerrarSesion(usuario: String) = Unit
}
