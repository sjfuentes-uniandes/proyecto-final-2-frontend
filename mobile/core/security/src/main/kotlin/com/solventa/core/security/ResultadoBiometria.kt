package com.solventa.core.security

/** Resultado tipado de [GestorBiometria.autenticar]. */
sealed class ResultadoBiometria {
    data object Exito : ResultadoBiometria()

    /** El usuario canceló (gesto atrás, toque fuera del diálogo o botón negativo). */
    data object Cancelado : ResultadoBiometria()

    /** Demasiados intentos fallidos: Android bloqueó la biometría temporal o permanentemente. */
    data object Bloqueado : ResultadoBiometria()

    data class Error(val mensaje: String) : ResultadoBiometria()
}
