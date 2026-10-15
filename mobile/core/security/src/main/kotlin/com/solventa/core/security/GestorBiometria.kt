package com.solventa.core.security

import android.content.Context
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Envuelve `androidx.biometric.BiometricPrompt` para el desbloqueo biométrico (huella/rostro) de
 * la sesión. No cifra nada por sí mismo: solo es la puerta de entrada que la UI (`feature:login`)
 * debe pasar antes de llamar a `GestorSesion.restaurarSesion()`.
 *
 * [disponibilidad] solo necesita un [Context] (se puede resolver desde un ViewModel con el
 * contexto de la aplicación); mostrar el diálogo sí requiere la [FragmentActivity] en pantalla,
 * así que se recibe como parámetro de [autenticar] en vez de en el constructor.
 */
class GestorBiometria(private val context: Context) {
    fun disponibilidad(): Disponibilidad =
        mapearDisponibilidad(BiometricManager.from(context).canAuthenticate(BIOMETRIC_STRONG))

    suspend fun autenticar(
        activity: FragmentActivity,
        titulo: String,
        subtitulo: String? = null,
        negativo: String,
    ): ResultadoBiometria =
        suspendCancellableCoroutine { continuacion ->
            val prompt = BiometricPrompt(
                activity,
                ContextCompat.getMainExecutor(activity),
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        if (continuacion.isActive) continuacion.resumeWith(Result.success(ResultadoBiometria.Exito))
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        if (continuacion.isActive) {
                            continuacion.resumeWith(Result.success(mapearErrorBiometria(errorCode, errString)))
                        }
                    }

                    override fun onAuthenticationFailed() {
                        // Un intento individual no reconoció la huella/rostro; el diálogo sigue
                        // activo y Android deja reintentar hasta bloquear (ERROR_LOCKOUT).
                    }
                },
            )

            val infoBuilder = BiometricPrompt.PromptInfo.Builder()
                .setTitle(titulo)
                .setNegativeButtonText(negativo)
                .setAllowedAuthenticators(BIOMETRIC_STRONG)
            subtitulo?.let(infoBuilder::setSubtitle)

            prompt.authenticate(infoBuilder.build())
            continuacion.invokeOnCancellation { prompt.cancelAuthentication() }
        }
}
