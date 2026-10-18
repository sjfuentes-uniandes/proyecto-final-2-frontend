package com.solventa.app

import android.os.Bundle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
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
import com.solventa.feature.onboardingidentidad.ui.OnboardingIdentidadRoute
import com.solventa.feature.onboardingidentidad.verificacion.CuentaViewModel
import com.solventa.feature.onboardingidentidad.verificacion.CuentaViewModelFactory
import com.solventa.feature.onboardingidentidad.verificacion.FinRegistro
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModel
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModelFactory

private enum class Pantalla { LOGIN, REGISTRO }

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
                var pantalla by rememberSaveable { mutableStateOf(Pantalla.LOGIN) }
                var finRegistro by rememberSaveable { mutableStateOf<FinRegistro?>(null) }

                when (pantalla) {
                    Pantalla.LOGIN -> {
                        val viewModel = viewModel<LoginViewModel>(
                            factory = LoginViewModelFactory(app.gestorSesion, app.gestorBiometria, app.bffMovilCliente),
                        )
                        LoginRoute(
                            viewModel = viewModel,
                            gestorBiometria = app.gestorBiometria,
                            activity = this,
                            onOlvideClave = { /* TODO: recuperación de contraseña (fuera del alcance de HU-07) */ },
                            onRegistrarme = { pantalla = Pantalla.REGISTRO },
                            onIngresoExitoso = { /* TODO: navegar a los servicios autorizados del cliente */ },
                        )
                    }

                    Pantalla.REGISTRO -> {
                        val verificacionViewModel = viewModel<VerificacionIdentidadViewModel>(
                            factory = VerificacionIdentidadViewModelFactory(app.verificarIdentidad),
                        )
                        // Atrás desde el formulario vuelve al ingreso; durante la verificación la ruta
                        // intercepta atrás primero (cancela la captura).
                        BackHandler { pantalla = Pantalla.LOGIN }
                        val cuentaViewModel = viewModel<CuentaViewModel>(factory = CuentaViewModelFactory(app.crearCuenta))
                        OnboardingIdentidadRoute(
                            verificacionViewModel = verificacionViewModel,
                            cuentaViewModel = cuentaViewModel,
                            sesionRegistro = app.sesionRegistro,
                            onRegistroTerminado = { fin -> finRegistro = fin },
                            onIrAIngreso = { pantalla = Pantalla.LOGIN },
                        )
                        finRegistro?.let { fin ->
                            // Solo se cierra con "Aceptar": la persona confirma que vio el resultado antes de ir al ingreso.
                            val (titulo, mensaje) = when (fin) {
                                FinRegistro.CUENTA_CREADA -> R.string.cuenta_creada_titulo to R.string.cuenta_creada_mensaje
                                FinRegistro.CUENTA_EXISTENTE -> R.string.cuenta_existente_titulo to R.string.cuenta_existente_mensaje
                                FinRegistro.INGRESO_PENDIENTE -> R.string.cuenta_creada_titulo to R.string.cuenta_ingreso_pendiente_mensaje
                            }
                            AlertDialog(
                                onDismissRequest = {},
                                title = { Text(stringResource(titulo)) },
                                text = { Text(stringResource(mensaje)) },
                                confirmButton = {
                                    TextButton(onClick = {
                                        finRegistro = null
                                        pantalla = Pantalla.LOGIN
                                    }) { Text(stringResource(R.string.cuenta_creada_aceptar)) }
                                },
                            )
                        }
                    }
                }
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
