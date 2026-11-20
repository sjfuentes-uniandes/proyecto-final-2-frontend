package com.solventa.core.auth

import android.content.Context
import com.amazonaws.ClientConfiguration
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUser
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserAttributes
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserCodeDeliveryDetails
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserPool
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.GenericHandler
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.SignUpHandler
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.VerificationHandler
import com.amazonaws.regions.Regions
import com.amazonaws.services.cognitoidentityprovider.model.SignUpResult
import com.solventa.core.network.Diag
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Adaptador de [ClienteRegistro] con el SDK nativo de Cognito (pool `clientes`, app client `mobile`). */
class CognitoClienteRegistro(
    context: Context,
    configuracion: ConfiguracionCognito,
) : ClienteRegistro {
    private val contexto = context.applicationContext
    private val poolId = configuracion.poolId
    private val clientId = configuracion.clientId
    private val region = Regions.fromName(configuracion.region)
    private val userPool = crearPool(ClientConfiguration())
    private val userPoolAlta by lazy {
        crearPool(ClientConfiguration().withSocketTimeout(TIMEOUT_LECTURA_ALTA_MS))
    }

    private fun crearPool(configuracion: ClientConfiguration) =
        CognitoUserPool(contexto, poolId, clientId, null, configuracion, region)

    override suspend fun registrar(
        correo: String,
        contrasena: String,
        tokenRegistro: String,
    ): ResultadoRegistroCuenta = suspendCancellableCoroutine { continuacion ->
        val atributos = CognitoUserAttributes().apply { addAttribute("email", correo) }
        userPoolAlta.signUpInBackground(
            correo,
            contrasena,
            atributos,
            null,
            mapOf(CLAVE_TOKEN_REGISTRO to tokenRegistro),
            object : SignUpHandler {
                override fun onSuccess(user: CognitoUser?, signUpResult: SignUpResult?) {
                    Diag.i("cognito.signUp ok confirmado=${signUpResult?.userConfirmed}")
                    continuacion.resume(ResultadoRegistroCuenta.Creada(signUpResult?.userConfirmed == true))
                }

                override fun onFailure(exception: Exception) {
                    Diag.e("cognito.signUp fallo=${exception.javaClass.simpleName}: ${exception.message}")
                    continuacion.resume(mapearErrorRegistro(exception))
                }
            },
        )
    }

    override suspend fun confirmar(correo: String, codigo: String): ResultadoConfirmacion =
        suspendCancellableCoroutine { continuacion ->
            userPool.getUser(correo).confirmSignUpInBackground(
                codigo,
                false,
                object : GenericHandler {
                    override fun onSuccess() {
                        Diag.i("cognito.confirmSignUp ok")
                        continuacion.resume(ResultadoConfirmacion.Confirmada)
                    }

                    override fun onFailure(exception: Exception) {
                        Diag.e("cognito.confirmSignUp fallo=${exception.javaClass.simpleName}: ${exception.message}")
                        continuacion.resume(mapearErrorConfirmacion(exception))
                    }
                },
            )
        }

    override suspend fun reenviarCodigo(correo: String): ResultadoReenvioCodigo =
        suspendCancellableCoroutine { continuacion ->
            userPool.getUser(correo).resendConfirmationCodeInBackground(
                object : VerificationHandler {
                    override fun onSuccess(verificationCodeDeliveryMedium: CognitoUserCodeDeliveryDetails?) {
                        Diag.i("cognito.resendCode ok")
                        continuacion.resume(ResultadoReenvioCodigo.Enviado)
                    }

                    override fun onFailure(exception: Exception) {
                        Diag.e("cognito.resendCode fallo=${exception.javaClass.simpleName}: ${exception.message}")
                        continuacion.resume(mapearErrorReenvio(exception))
                    }
                },
            )
        }

    private companion object {
        const val TIMEOUT_LECTURA_ALTA_MS = 30_000
    }
}
