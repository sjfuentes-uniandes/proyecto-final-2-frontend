package com.solventa.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.login.LoginRoute
import com.solventa.feature.login.LoginViewModel
import com.solventa.feature.login.LoginViewModelFactory

/**
 * `FragmentActivity` (no `ComponentActivity`) porque `BiometricPrompt` lo exige para mostrar el
 * diálogo de huella/rostro (ver `GestorBiometria`).
 */
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as SolventaApp

        setContent {
            SolventaTheme {
                val viewModel = viewModel<LoginViewModel>(
                    factory = LoginViewModelFactory(app.gestorSesion, app.gestorBiometria, app.bffMovilCliente),
                )
                LoginRoute(
                    viewModel = viewModel,
                    gestorBiometria = app.gestorBiometria,
                    activity = this,
                    onOlvideClave = { /* TODO: recuperación de contraseña (fuera del alcance de HU-07) */ },
                    onRegistrarme = { /* TODO: registro de cliente (fuera del alcance de HU-07) */ },
                    onIngresoExitoso = { /* TODO: navegar a los servicios autorizados del cliente */ },
                )
            }
        }
    }
}
