package com.solventa.app

import android.os.Bundle
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
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.core.security.GestorBiometria
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
import com.solventa.feature.onboardingidentidad.verificacion.SesionRegistro
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModel
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModelFactory

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
        val dependencias = DependenciasNavegacion(
            fabricaLogin = LoginViewModelFactory(app.gestorSesion, app.gestorBiometria, app.bffMovilCliente),
            gestorBiometria = app.gestorBiometria,
            fabricaPrivacidad = PrivacidadViewModelFactory(app.repositorioConsentimientos, app.verificadorBiometrico),
            fabricaVerificacion = VerificacionIdentidadViewModelFactory(app.verificarIdentidad),
            fabricaCuenta = CuentaViewModelFactory(app.crearCuenta),
            sesionRegistro = app.sesionRegistro,
        )

        setContent { ContenidoSolventa(dependencias, this) }
    }

    override fun onDestroy() {
        (application as SolventaApp).verificadorBiometrico.soltar(this)
        super.onDestroy()
    }
}

/** Lo que la navegación toma de la raíz de composición ([SolventaApp]); las pruebas lo arman con dobles. */
internal class DependenciasNavegacion(
    val fabricaLogin: ViewModelProvider.Factory,
    val gestorBiometria: GestorBiometria,
    val fabricaPrivacidad: ViewModelProvider.Factory,
    val fabricaVerificacion: ViewModelProvider.Factory,
    val fabricaCuenta: ViewModelProvider.Factory,
    val sesionRegistro: SesionRegistro,
)

/** Contenido de [MainActivity], fuera de ella para probar la navegación sin la app real. */
@Composable
internal fun ContenidoSolventa(dependencias: DependenciasNavegacion, actividad: FragmentActivity) {
    SolventaTheme {
        NavegacionSolventa(dependencias, actividad)
    }
}

private object Rutas {
    const val LOGIN = "login"
    const val REGISTRO = "registro"
    const val PRIVACIDAD = "privacidad"
    const val PERMISO_OPEN_FINANCE = "privacidad/open-finance"
}

@Composable
private fun NavegacionSolventa(dependencias: DependenciasNavegacion, actividad: FragmentActivity) {
    val navegacion = rememberNavController()
    // Lista y detalle de Privacidad comparten un ViewModel con el alcance de la actividad.
    val fabricaPrivacidad = dependencias.fabricaPrivacidad

    NavHost(navController = navegacion, startDestination = Rutas.LOGIN) {
        composable(Rutas.LOGIN) {
            val viewModel = viewModel<LoginViewModel>(factory = dependencias.fabricaLogin)
            LoginRoute(
                viewModel = viewModel,
                gestorBiometria = dependencias.gestorBiometria,
                activity = actividad,
                onOlvideClave = { /* TODO: recuperación de contraseña (fuera del alcance de HU-07) */ },
                onRegistrarme = { navegacion.navigate(Rutas.REGISTRO) },
                onIngresoExitoso = {
                    // Provisional (HU-M08): aún no hay pantalla de inicio con los servicios del cliente.
                    navegacion.navigate(Rutas.PRIVACIDAD) { popUpTo(Rutas.LOGIN) { inclusive = true } }
                },
            )
        }
        composable(Rutas.REGISTRO) {
            // Atrás desde el formulario vuelve al ingreso (el NavHost desapila el registro); durante
            // la verificación la ruta intercepta atrás primero (cancela la captura).
            val volverAlIngreso: () -> Unit = { navegacion.popBackStack(Rutas.LOGIN, inclusive = false) }
            var finRegistro by rememberSaveable { mutableStateOf<FinRegistro?>(null) }
            OnboardingIdentidadRoute(
                verificacionViewModel = viewModel<VerificacionIdentidadViewModel>(factory = dependencias.fabricaVerificacion),
                cuentaViewModel = viewModel<CuentaViewModel>(factory = dependencias.fabricaCuenta),
                sesionRegistro = dependencias.sesionRegistro,
                onRegistroTerminado = { fin -> finRegistro = fin },
                onIrAIngreso = volverAlIngreso,
            )
            finRegistro?.let { fin ->
                DialogoFinRegistro(fin) {
                    finRegistro = null
                    volverAlIngreso()
                }
            }
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

/** Solo se cierra con "Aceptar": la persona confirma que vio el resultado antes de ir al ingreso. */
@Composable
private fun DialogoFinRegistro(fin: FinRegistro, onAceptar: () -> Unit) {
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
            TextButton(onClick = onAceptar) { Text(stringResource(R.string.cuenta_creada_aceptar)) }
        },
    )
}
