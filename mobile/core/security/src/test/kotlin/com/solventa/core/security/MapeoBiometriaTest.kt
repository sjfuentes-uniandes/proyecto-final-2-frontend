package com.solventa.core.security

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import org.junit.Test
import kotlin.test.assertEquals

class MapeoBiometriaTest {
    @Test
    fun `mapearDisponibilidad traduce exito y los dos casos documentados`() {
        assertEquals(Disponibilidad.DISPONIBLE, mapearDisponibilidad(BiometricManager.BIOMETRIC_SUCCESS))
        assertEquals(Disponibilidad.SIN_HUELLAS_REGISTRADAS, mapearDisponibilidad(BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED))
        assertEquals(Disponibilidad.SIN_HARDWARE, mapearDisponibilidad(BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE))
    }

    @Test
    fun `mapearDisponibilidad trata cualquier otro codigo como no disponible temporalmente`() {
        assertEquals(
            Disponibilidad.NO_DISPONIBLE_TEMPORALMENTE,
            mapearDisponibilidad(BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE),
        )
    }

    @Test
    fun `mapearErrorBiometria traduce cancelaciones del usuario`() {
        assertEquals(ResultadoBiometria.Cancelado, mapearErrorBiometria(BiometricPrompt.ERROR_USER_CANCELED, "cancelado"))
        assertEquals(ResultadoBiometria.Cancelado, mapearErrorBiometria(BiometricPrompt.ERROR_NEGATIVE_BUTTON, "cancelado"))
        assertEquals(ResultadoBiometria.Cancelado, mapearErrorBiometria(BiometricPrompt.ERROR_CANCELED, "cancelado"))
    }

    @Test
    fun `mapearErrorBiometria traduce bloqueos temporales y permanentes`() {
        assertEquals(ResultadoBiometria.Bloqueado, mapearErrorBiometria(BiometricPrompt.ERROR_LOCKOUT, "bloqueado"))
        assertEquals(ResultadoBiometria.Bloqueado, mapearErrorBiometria(BiometricPrompt.ERROR_LOCKOUT_PERMANENT, "bloqueado"))
    }

    @Test
    fun `mapearErrorBiometria preserva el mensaje para errores no mapeados`() {
        val resultado = mapearErrorBiometria(BiometricPrompt.ERROR_HW_UNAVAILABLE, "sensor ocupado")

        assertEquals(ResultadoBiometria.Error("sensor ocupado"), resultado)
    }
}
