package com.solventa.app

import android.app.Application
import com.solventa.core.auth.ClienteIdentidad
import com.solventa.core.auth.CognitoClienteIdentidad
import com.solventa.core.auth.ConfiguracionCognito
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.ConsentimientosCliente
import com.solventa.core.network.RedModule
import com.solventa.core.security.AlmacenSesionSeguraKeystore
import com.solventa.core.security.GestorBiometria
import com.solventa.feature.privacidad.biometria.VerificadorBiometricoPrompt
import com.solventa.feature.privacidad.datos.RepositorioConsentimientosRed
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos

/**
 * Punto de arranque de la app y raíz de composición (DI manual: no hay Hilt/Koin en el proyecto).
 * Expone las piezas ya cableadas para que las Activities/ViewModels las tomen de aquí.
 */
class SolventaApp : Application() {
    lateinit var gestorSesion: GestorSesion
        private set
    lateinit var gestorBiometria: GestorBiometria
        private set
    lateinit var bffMovilCliente: BffMovilCliente
        private set
    lateinit var repositorioConsentimientos: RepositorioConsentimientos
        private set
    /** Uno por proceso: la actividad en pantalla se adjunta al crearse y se suelta al destruirse. */
    lateinit var verificadorBiometrico: VerificadorBiometricoPrompt
        private set

    override fun onCreate() {
        super.onCreate()

        gestorBiometria = GestorBiometria(this)

        val almacenSesionSegura = AlmacenSesionSeguraKeystore(this)
        gestorSesion = GestorSesion(crearClienteIdentidad(), almacenSesionSegura)

        val api = RedModule.crearApi(BuildConfig.BFF_MOVIL_BASE_URL, gestorSesion)
        bffMovilCliente = BffMovilCliente(api)
        repositorioConsentimientos = RepositorioConsentimientosRed(ConsentimientosCliente(api))
        verificadorBiometrico = VerificadorBiometricoPrompt(gestorBiometria)
    }

    private fun crearClienteIdentidad(): ClienteIdentidad {
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

private object ClienteIdentidadSinConfigurar : ClienteIdentidad {
    private val error = ResultadoAutenticacion.ErrorDesconocido(
        "Falta configurar Cognito en local.properties (cognitoPoolId/cognitoClientId)",
    )

    override suspend fun autenticar(usuario: String, contrasena: String) = error

    override suspend fun confirmarCodigoMfa(codigo: String) = error

    override suspend fun restaurarSesion(usuario: String) = error

    override fun cerrarSesion(usuario: String) = Unit
}
