package com.solventa.feature.onboardingidentidad.verificacion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider

/** Fábrica manual (no hay Hilt/Koin en el proyecto) para que el ViewModel sobreviva rotaciones. */
class VerificacionIdentidadViewModelFactory(
    private val verificarIdentidad: VerificarIdentidad,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return VerificacionIdentidadViewModel(verificarIdentidad) as T
    }
}
