package com.solventa.feature.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.solventa.core.auth.GestorSesion
import com.solventa.core.security.GestorBiometria

/** Fábrica manual (no hay Hilt/Koin en el proyecto) para que [LoginViewModel] sobreviva rotaciones. */
class LoginViewModelFactory(
    private val gestorSesion: GestorSesion,
    private val gestorBiometria: GestorBiometria,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return LoginViewModel(gestorSesion, gestorBiometria) as T
    }
}
