package com.solventa.core.auth

/**
 * Resultado tipado de autenticar contra el pool `clientes` de Cognito (ver [ClienteIdentidad]).
 * El `mensaje` de los casos de error, cuando lo hay, ya está listo para mostrar al usuario.
 */
sealed class ResultadoAutenticacion {
    data class Exito(val sesion: SesionAuth) : ResultadoAutenticacion()

    /** El pool exige un código TOTP (MFA opcional); responder con `confirmarCodigoMfa`. */
    data object CodigoMfaRequerido : ResultadoAutenticacion()

    /** Usuario o contraseña incorrectos (o el código MFA no coincide). */
    data object CredencialesInvalidas : ResultadoAutenticacion()

    /** El usuario existe pero no ha confirmado su cuenta. */
    data object UsuarioNoConfirmado : ResultadoAutenticacion()

    /** Cognito bloqueó temporalmente los intentos por exceso de intentos fallidos. */
    data object IntentosExcedidos : ResultadoAutenticacion()

    /**
     * No hay una sesión en caché que se pueda restaurar en silencio (ver
     * `ClienteIdentidad.restaurarSesion`): hace falta usuario y contraseña de nuevo.
     */
    data object SesionNoDisponible : ResultadoAutenticacion()

    /** Sin conexión o error de transporte (no llegó a responder Cognito). */
    data class SinConexion(val mensaje: String) : ResultadoAutenticacion()

    /** Cualquier otro error no mapeado explícitamente. */
    data class ErrorDesconocido(val mensaje: String) : ResultadoAutenticacion()
}
