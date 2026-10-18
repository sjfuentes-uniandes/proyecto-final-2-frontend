package com.solventa.feature.privacidad

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.solventa.feature.privacidad.casos.ListarConsentimientos
import com.solventa.feature.privacidad.casos.ObtenerTextoVigente
import com.solventa.feature.privacidad.casos.OtorgarConsentimiento
import com.solventa.feature.privacidad.casos.RevocarConsentimiento
import com.solventa.feature.privacidad.casos.VerDetalleConsentimiento
import com.solventa.feature.privacidad.casos.VerHistorialConsentimiento
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico

/** Fábrica manual (no hay Hilt/Koin en el proyecto) para que [PrivacidadViewModel] sobreviva rotaciones. */
class PrivacidadViewModelFactory(
    private val repositorio: RepositorioConsentimientos,
    private val verificador: VerificadorBiometrico,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return PrivacidadViewModel(
            ListarConsentimientos(repositorio),
            VerDetalleConsentimiento(repositorio),
            ObtenerTextoVigente(repositorio),
            OtorgarConsentimiento(repositorio, verificador),
            RevocarConsentimiento(repositorio, verificador),
            VerHistorialConsentimiento(repositorio),
        ) as T
    }
}
