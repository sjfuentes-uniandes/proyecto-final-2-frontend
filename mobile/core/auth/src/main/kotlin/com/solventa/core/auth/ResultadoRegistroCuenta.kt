package com.solventa.core.auth

/** Resultado de crear la cuenta en Cognito (SignUp). No expone mensajes del servidor: la UI usa sus textos. */
sealed class ResultadoRegistroCuenta {
    /** Cuenta creada; Cognito envió el código al correo salvo que ya esté confirmada. */
    data class Creada(val confirmada: Boolean) : ResultadoRegistroCuenta()

    /** El pre sign-up rechazó el `tokenRegistro` (faltante, vencido o de otro correo): volver a verificar. */
    data object TokenRegistroRechazado : ResultadoRegistroCuenta()

    /** El correo ya tiene cuenta: mandar a iniciar sesión. */
    data object CorreoYaRegistrado : ResultadoRegistroCuenta()

    /** La contraseña no cumple la política (mínimo 10, mayúscula, minúscula y número). */
    data object ContrasenaInvalida : ResultadoRegistroCuenta()

    data object IntentosExcedidos : ResultadoRegistroCuenta()

    data class SinConexion(val detalle: String) : ResultadoRegistroCuenta()

    data class ErrorDesconocido(val detalle: String) : ResultadoRegistroCuenta()
}

/** Resultado de `ConfirmSignUp` con el código que Cognito envía por correo. */
sealed class ResultadoConfirmacion {
    data object Confirmada : ResultadoConfirmacion()

    data object CodigoIncorrecto : ResultadoConfirmacion()

    data object CodigoVencido : ResultadoConfirmacion()

    data object IntentosExcedidos : ResultadoConfirmacion()

    data class SinConexion(val detalle: String) : ResultadoConfirmacion()

    data class ErrorDesconocido(val detalle: String) : ResultadoConfirmacion()
}

/** Resultado de pedir otro código de confirmación. */
sealed class ResultadoReenvioCodigo {
    data object Enviado : ResultadoReenvioCodigo()

    data object IntentosExcedidos : ResultadoReenvioCodigo()

    data class SinConexion(val detalle: String) : ResultadoReenvioCodigo()

    data class ErrorDesconocido(val detalle: String) : ResultadoReenvioCodigo()
}
