package com.solventa.core.auth

import android.content.Context
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoDevice
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserPool
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserSession
import com.amazonaws.mobileconnectors.cognitoidentityprovider.continuations.AuthenticationContinuation
import com.amazonaws.mobileconnectors.cognitoidentityprovider.continuations.AuthenticationDetails
import com.amazonaws.mobileconnectors.cognitoidentityprovider.continuations.ChallengeContinuation
import com.amazonaws.mobileconnectors.cognitoidentityprovider.continuations.MultiFactorAuthenticationContinuation
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.AuthenticationHandler
import com.amazonaws.regions.Regions
import com.amazonaws.services.cognitoidentityprovider.model.LimitExceededException
import com.amazonaws.services.cognitoidentityprovider.model.NotAuthorizedException
import com.amazonaws.services.cognitoidentityprovider.model.TooManyRequestsException
import com.amazonaws.services.cognitoidentityprovider.model.UserNotConfirmedException
import com.amazonaws.services.cognitoidentityprovider.model.UserNotFoundException
import com.solventa.core.network.Diag
import java.io.IOException
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Adaptador de [ClienteIdentidad] contra el pool `clientes` de Cognito (app client `mobile`,
 * sin client secret), con el SDK nativo de Android: SRP para el ingreso. El propio SDK cachea
 * los tokens localmente y los refresca al volver a pedir sesión (`getSessionInBackground`), así
 * que `restaurarSesion` reutiliza ese mismo mecanismo sin que `core:auth` conozca el refresh
 * token.
 *
 * Solo admite un intento de ingreso en curso a la vez: no es seguro para llamadas concurrentes
 * (un único `GestorSesion` por proceso ya lo garantiza).
 */
class CognitoClienteIdentidad(
    context: Context,
    configuracion: ConfiguracionCognito,
) : ClienteIdentidad {
    private val userPool = CognitoUserPool(
        context.applicationContext,
        configuracion.poolId,
        configuracion.clientId,
        null,
        Regions.fromName(configuracion.region),
    )

    private var contrasenaEnCurso: String? = null
    private var continuacionMfa: MultiFactorAuthenticationContinuation? = null
    private var continuacionPendiente: CancellableContinuation<ResultadoAutenticacion>? = null

    private val manejador = object : AuthenticationHandler {
        override fun onSuccess(userSession: CognitoUserSession, newDevice: CognitoDevice?) {
            Diag.i("cognito.auth ok")
            resolver(ResultadoAutenticacion.Exito(userSession.aSesionAuth()))
        }

        override fun getAuthenticationDetails(
            authenticationContinuation: AuthenticationContinuation,
            userId: String,
        ) {
            val contrasena = contrasenaEnCurso
            if (contrasena == null) {
                // Flujo de restauración silenciosa (restaurarSesion): sin contraseña no hay
                // forma de continuar, significa que no quedó una sesión válida en caché.
                Diag.w("cognito.auth sin sesion en cache")
                resolver(ResultadoAutenticacion.SesionNoDisponible)
            } else {
                authenticationContinuation.setAuthenticationDetails(AuthenticationDetails(userId, contrasena, null))
                authenticationContinuation.continueTask()
            }
        }

        override fun getMFACode(continuation: MultiFactorAuthenticationContinuation) {
            Diag.i("cognito.auth requiere MFA")
            continuacionMfa = continuation
            resolver(ResultadoAutenticacion.CodigoMfaRequerido)
        }

        override fun authenticationChallenge(continuation: ChallengeContinuation) {
            Diag.w("cognito.auth reto no soportado=${continuation.challengeName}")
            resolver(ResultadoAutenticacion.ErrorDesconocido("Reto de autenticación no soportado"))
        }

        override fun onFailure(exception: Exception) {
            Diag.e("cognito.auth fallo=${exception.javaClass.simpleName}: ${exception.message}")
            resolver(mapearError(exception))
        }
    }

    override suspend fun autenticar(usuario: String, contrasena: String): ResultadoAutenticacion =
        suspendCancellableCoroutine { continuacion ->
            contrasenaEnCurso = contrasena
            continuacionPendiente = continuacion
            userPool.getUser(usuario).getSessionInBackground(manejador)
        }

    override suspend fun confirmarCodigoMfa(codigo: String): ResultadoAutenticacion =
        suspendCancellableCoroutine { continuacion ->
            val mfa = continuacionMfa
            if (mfa == null) {
                continuacion.resumeWith(Result.success(ResultadoAutenticacion.ErrorDesconocido("No hay un código MFA pendiente")))
            } else {
                continuacionMfa = null
                continuacionPendiente = continuacion
                mfa.setMfaCode(codigo)
                mfa.continueTask()
            }
        }

    override suspend fun restaurarSesion(usuario: String): ResultadoAutenticacion =
        suspendCancellableCoroutine { continuacion ->
            contrasenaEnCurso = null
            continuacionPendiente = continuacion
            userPool.getUser(usuario).getSessionInBackground(manejador)
        }

    override fun cerrarSesion(usuario: String) {
        userPool.getUser(usuario).signOut()
    }

    private fun resolver(resultado: ResultadoAutenticacion) {
        val continuacion = continuacionPendiente ?: return
        continuacionPendiente = null
        if (continuacion.isActive) continuacion.resumeWith(Result.success(resultado))
    }

    private fun CognitoUserSession.aSesionAuth() = SesionAuth(
        accessToken = accessToken.getJWTToken(),
        idToken = idToken.getJWTToken(),
        expiraEnMillis = accessToken.getExpiration()?.time ?: 0L,
    )

    private fun mapearError(excepcion: Exception): ResultadoAutenticacion = when (excepcion) {
        is UserNotConfirmedException -> ResultadoAutenticacion.UsuarioNoConfirmado
        is UserNotFoundException -> ResultadoAutenticacion.CredencialesInvalidas
        is NotAuthorizedException ->
            if (excepcion.message?.contains("attempts exceeded", ignoreCase = true) == true) {
                ResultadoAutenticacion.IntentosExcedidos
            } else {
                ResultadoAutenticacion.CredencialesInvalidas
            }
        is TooManyRequestsException, is LimitExceededException -> ResultadoAutenticacion.IntentosExcedidos
        is IOException -> ResultadoAutenticacion.SinConexion(excepcion.message ?: "Sin conexión")
        else -> ResultadoAutenticacion.ErrorDesconocido(
            excepcion.message ?: "No fue posible completar la operación. Inténtalo de nuevo.",
        )
    }
}
