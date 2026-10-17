package com.solventa.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.login.LoginRoute
import com.solventa.feature.login.LoginViewModel
import com.solventa.feature.login.LoginViewModelFactory
import com.solventa.feature.privacidad.PrivacidadViewModel
import com.solventa.feature.privacidad.PrivacidadViewModelFactory
import com.solventa.feature.privacidad.ui.PermisoOpenFinanceRoute
import com.solventa.feature.privacidad.ui.PrivacidadListaRoute

/**
 * `FragmentActivity` (no `ComponentActivity`) porque `BiometricPrompt` lo exige para mostrar el
 * diálogo de huella/rostro (ver `GestorBiometria`): lo usan el ingreso y el otorgamiento de
 * consentimientos (ADR 0007).
 */
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as SolventaApp
        // El verificador vive en la app; solo conoce la actividad en pantalla (referencia débil).
        app.verificadorBiometrico.adjuntar(this)

        setContent {
            SolventaTheme {
                NavegacionSolventa(app, this)
            }
        }
    }

    override fun onDestroy() {
        (application as SolventaApp).verificadorBiometrico.soltar(this)
        super.onDestroy()
    }
}

private object Rutas {
    const val LOGIN = "login"
    const val PRIVACIDAD = "privacidad"
    const val PERMISO_OPEN_FINANCE = "privacidad/open-finance"
}

@Composable
private fun NavegacionSolventa(app: SolventaApp, actividad: FragmentActivity) {
    val navegacion = rememberNavController()
    // Lista y detalle de Privacidad comparten un ViewModel con el alcance de la actividad.
    val fabricaPrivacidad = PrivacidadViewModelFactory(app.repositorioConsentimientos, app.verificadorBiometrico)

    NavHost(navController = navegacion, startDestination = Rutas.LOGIN) {
        composable(Rutas.LOGIN) {
            val viewModel = viewModel<LoginViewModel>(
                factory = LoginViewModelFactory(app.gestorSesion, app.gestorBiometria, app.bffMovilCliente),
            )
            LoginRoute(
                viewModel = viewModel,
                gestorBiometria = app.gestorBiometria,
                activity = actividad,
                onOlvideClave = { /* TODO: recuperación de contraseña (fuera del alcance de HU-07) */ },
                onRegistrarme = { /* TODO: registro de cliente (fuera del alcance de HU-07) */ },
                onIngresoExitoso = {
                    // Provisional (HU-M08): aún no hay pantalla de inicio con los servicios del cliente.
                    navegacion.navigate(Rutas.PRIVACIDAD) { popUpTo(Rutas.LOGIN) { inclusive = true } }
                },
            )
        }
        composable(Rutas.PRIVACIDAD) {
            PrivacidadListaRoute(
                viewModel = viewModel<PrivacidadViewModel>(viewModelStoreOwner = actividad, factory = fabricaPrivacidad),
                onAbrirPermiso = { navegacion.navigate(Rutas.PERMISO_OPEN_FINANCE) },
            )
        }
        composable(Rutas.PERMISO_OPEN_FINANCE) {
            PermisoOpenFinanceRoute(
                viewModel = viewModel<PrivacidadViewModel>(viewModelStoreOwner = actividad, factory = fabricaPrivacidad),
                onVolver = { navegacion.popBackStack() },
            )
        }
    }
}
