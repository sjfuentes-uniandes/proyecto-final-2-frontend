package com.solventa.core.security

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt

/**
 * Traduce los códigos de `BiometricManager`/`BiometricPrompt` (enteros, documentados por
 * Android) a los tipos de este módulo. Aparte como funciones puras (reciben solo enteros/texto,
 * no objetos de Android) para poder probarlas sin instrumentación.
 */
internal fun mapearDisponibilidad(codigo: Int): Disponibilidad = when (codigo) {
    BiometricManager.BIOMETRIC_SUCCESS -> Disponibilidad.DISPONIBLE
    BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> Disponibilidad.SIN_HUELLAS_REGISTRADAS
    BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> Disponibilidad.SIN_HARDWARE
    else -> Disponibilidad.NO_DISPONIBLE_TEMPORALMENTE
}

internal fun mapearErrorBiometria(codigo: Int, mensaje: CharSequence): ResultadoBiometria = when (codigo) {
    BiometricPrompt.ERROR_USER_CANCELED,
    BiometricPrompt.ERROR_NEGATIVE_BUTTON,
    BiometricPrompt.ERROR_CANCELED,
    -> ResultadoBiometria.Cancelado

    BiometricPrompt.ERROR_LOCKOUT, BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> ResultadoBiometria.Bloqueado

    else -> ResultadoBiometria.Error(mensaje.toString())
}
