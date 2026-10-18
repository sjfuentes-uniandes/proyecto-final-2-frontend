package com.solventa.feature.privacidad.biometria

import androidx.fragment.app.FragmentActivity
import com.solventa.core.security.Disponibilidad
import com.solventa.core.security.GestorBiometria
import com.solventa.core.security.ResultadoBiometria
import com.solventa.feature.privacidad.R
import com.solventa.feature.privacidad.dominio.AccionBiometrica
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico
import java.lang.ref.WeakReference

/**
 * [VerificadorBiometrico] sobre `BiometricPrompt` (vía [GestorBiometria], ADR 0007).
 *
 * El ViewModel vive más que la actividad (rotaciones), así que la actividad no se recibe en el
 * constructor: la pantalla la adjunta al crearse y la suelta al destruirse, y aquí solo se guarda
 * una referencia débil. Sin actividad en pantalla, o sin biometría utilizable, no se otorga ni
 * se revoca.
 */
class VerificadorBiometricoPrompt(private val gestor: GestorBiometria) : VerificadorBiometrico {
    private var actividad: WeakReference<FragmentActivity>? = null

    fun adjuntar(actividad: FragmentActivity) {
        this.actividad = WeakReference(actividad)
    }

    fun soltar(actividad: FragmentActivity) {
        if (this.actividad?.get() === actividad) this.actividad = null
    }

    override suspend fun confirmar(accion: AccionBiometrica): ConfirmacionBiometrica {
        if (gestor.disponibilidad() != Disponibilidad.DISPONIBLE) return ConfirmacionBiometrica.NO_DISPONIBLE
        val enPantalla = actividad?.get() ?: return ConfirmacionBiometrica.NO_DISPONIBLE
        // Los textos se resuelven con la actividad actual: siguen el idioma de la app.
        val resultado = gestor.autenticar(
            activity = enPantalla,
            titulo = enPantalla.getString(accion.tituloRes()),
            subtitulo = enPantalla.getString(accion.subtituloRes()),
            negativo = enPantalla.getString(R.string.privacidad_biometria_negativo),
        )
        return when (resultado) {
            ResultadoBiometria.Exito -> ConfirmacionBiometrica.CONFIRMADA
            ResultadoBiometria.Cancelado -> ConfirmacionBiometrica.CANCELADA
            ResultadoBiometria.Bloqueado -> ConfirmacionBiometrica.NO_DISPONIBLE
            is ResultadoBiometria.Error -> ConfirmacionBiometrica.FALLIDA
        }
    }
}

private fun AccionBiometrica.tituloRes(): Int = when (this) {
    AccionBiometrica.OTORGAR -> R.string.privacidad_biometria_titulo
    AccionBiometrica.REVOCAR -> R.string.privacidad_biometria_revocar_titulo
}

private fun AccionBiometrica.subtituloRes(): Int = when (this) {
    AccionBiometrica.OTORGAR -> R.string.privacidad_biometria_subtitulo
    AccionBiometrica.REVOCAR -> R.string.privacidad_biometria_revocar_subtitulo
}
