package com.solventa.app

import android.os.Bundle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
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
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.login.LoginRoute
import com.solventa.feature.login.LoginViewModel
import com.solventa.feature.login.LoginViewModelFactory
import com.solventa.feature.onboardingidentidad.ui.OnboardingIdentidadRoute
import com.solventa.feature.onboardingidentidad.verificacion.CuentaViewModel
import com.solventa.feature.onboardingidentidad.verificacion.CuentaViewModelFactory
import com.solventa.feature.onboardingidentidad.verificacion.FinRegistro
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModel
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModelFactory

private enum class Pantalla { LOGIN, REGISTRO }

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
}
