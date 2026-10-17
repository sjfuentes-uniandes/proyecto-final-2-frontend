package com.solventa.core.auth

import android.content.Context
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUser
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserAttributes
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserCodeDeliveryDetails
import com.amazonaws.mobileconnectors.cognitoidentityprovider.CognitoUserPool
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.GenericHandler
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.SignUpHandler
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.VerificationHandler
import com.amazonaws.regions.Regions
import com.amazonaws.services.cognitoidentityprovider.model.SignUpResult
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Adaptador de [ClienteRegistro] con el SDK nativo de Cognito (pool `clientes`, app client `mobile`). */
class CognitoClienteRegistro(
    context: Context,
    configuracion: ConfiguracionCognito,
) : ClienteRegistro {
    private val userPool = CognitoUserPool(
        context.applicationContext,
        configuracion.poolId,
        configuracion.clientId,
        null,
        Regions.fromName(configuracion.region),
    )

    override suspend fun registrar(
        correo: String,
        contrasena: String,
        tokenRegistro: String,
    ): ResultadoRegistroCuenta = suspendCancellableCoroutine { continuacion ->
        val atributos = CognitoUserAttributes().apply { addAttribute("email", correo) }
        userPool.signUpInBackground(
            correo,
            contrasena,
            atributos,
            null,
            mapOf(CLAVE_TOKEN_REGISTRO to tokenRegistro),
            object : SignUpHandler {
                override fun onSuccess(user: CognitoUser?, signUpResult: SignUpResult?) {
                    continuacion.resume(ResultadoRegistroCuenta.Creada(signUpResult?.userConfirmed == true))
                }

                override fun onFailure(exception: Exception) {
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
                    override fun onSuccess() = continuacion.resume(ResultadoConfirmacion.Confirmada)

                    override fun onFailure(exception: Exception) =
                        continuacion.resume(mapearErrorConfirmacion(exception))
                },
            )
        }

    override suspend fun reenviarCodigo(correo: String): ResultadoReenvioCodigo =
        suspendCancellableCoroutine { continuacion ->
            userPool.getUser(correo).resendConfirmationCodeInBackground(
                object : VerificationHandler {
                    override fun onSuccess(verificationCodeDeliveryMedium: CognitoUserCodeDeliveryDetails?) =
                        continuacion.resume(ResultadoReenvioCodigo.Enviado)

                    override fun onFailure(exception: Exception) =
                        continuacion.resume(mapearErrorReenvio(exception))
                },
            )
        }
}
