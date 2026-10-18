package com.solventa.core.auth

import com.amazonaws.services.cognitoidentityprovider.model.CodeMismatchException
import com.amazonaws.services.cognitoidentityprovider.model.ExpiredCodeException
import com.amazonaws.services.cognitoidentityprovider.model.InvalidParameterException
import com.amazonaws.services.cognitoidentityprovider.model.InvalidPasswordException
import com.amazonaws.services.cognitoidentityprovider.model.LimitExceededException
import com.amazonaws.services.cognitoidentityprovider.model.TooManyRequestsException
import com.amazonaws.services.cognitoidentityprovider.model.UserLambdaValidationException
import com.amazonaws.services.cognitoidentityprovider.model.UsernameExistsException
import java.io.IOException

/** Clave exacta que el backend espera en `ClientMetadata` del SignUp. */
internal const val CLAVE_TOKEN_REGISTRO = "tokenRegistro"

/** Código con el que el Lambda pre sign-up rechaza un registro sin verificación válida. */
private const val CODIGO_REGISTRO_NO_AUTORIZADO = "REGISTRO_NO_AUTORIZADO"

internal fun mapearErrorRegistro(excepcion: Exception): ResultadoRegistroCuenta = when (excepcion) {
    is UserLambdaValidationException ->
        if (excepcion.message?.contains(CODIGO_REGISTRO_NO_AUTORIZADO) == true) {
            ResultadoRegistroCuenta.TokenRegistroRechazado
        } else {
            ResultadoRegistroCuenta.ErrorDesconocido("Registro rechazado")
        }
    is UsernameExistsException -> ResultadoRegistroCuenta.CorreoYaRegistrado
    is InvalidPasswordException -> ResultadoRegistroCuenta.ContrasenaInvalida
    is InvalidParameterException ->
        if (excepcion.message?.contains("password", ignoreCase = true) == true) {
            ResultadoRegistroCuenta.ContrasenaInvalida
        } else {
            ResultadoRegistroCuenta.ErrorDesconocido("Datos de registro inválidos")
        }
    is TooManyRequestsException, is LimitExceededException -> ResultadoRegistroCuenta.IntentosExcedidos
    is IOException -> ResultadoRegistroCuenta.SinConexion(excepcion.message ?: "Sin conexión")
    else -> ResultadoRegistroCuenta.ErrorDesconocido(excepcion.message ?: "No fue posible crear la cuenta")
}

internal fun mapearErrorConfirmacion(excepcion: Exception): ResultadoConfirmacion = when (excepcion) {
    is CodeMismatchException -> ResultadoConfirmacion.CodigoIncorrecto
    is ExpiredCodeException -> ResultadoConfirmacion.CodigoVencido
    is TooManyRequestsException, is LimitExceededException -> ResultadoConfirmacion.IntentosExcedidos
    is IOException -> ResultadoConfirmacion.SinConexion(excepcion.message ?: "Sin conexión")
    else -> ResultadoConfirmacion.ErrorDesconocido(excepcion.message ?: "No fue posible confirmar el correo")
}

internal fun mapearErrorReenvio(excepcion: Exception): ResultadoReenvioCodigo = when (excepcion) {
    is TooManyRequestsException, is LimitExceededException -> ResultadoReenvioCodigo.IntentosExcedidos
    is IOException -> ResultadoReenvioCodigo.SinConexion(excepcion.message ?: "Sin conexión")
    else -> ResultadoReenvioCodigo.ErrorDesconocido(excepcion.message ?: "No fue posible reenviar el código")
}
