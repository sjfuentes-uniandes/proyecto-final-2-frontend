package com.solventa.feature.login

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.fragment.app.FragmentActivity
import com.solventa.core.security.GestorBiometria
import kotlinx.coroutines.launch

/**
 * Conecta [LoginScreen] con [LoginViewModel] y dispara el diálogo de `BiometricPrompt` (hace
 * falta la Activity en pantalla, por eso vive aquí y no en el ViewModel). Navega a
 * [onIngresoExitoso] en cuanto `GestorSesion` reporta una sesión autenticada (AC1).
 */
@Composable
fun LoginRoute(
    viewModel: LoginViewModel,
    gestorBiometria: GestorBiometria,
    activity: FragmentActivity,
    onOlvideClave: () -> Unit,
    onRegistrarme: () -> Unit,
    onIngresoExitoso: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsState()
    val autenticado by viewModel.sesionActiva.collectAsState()
    val alcance = rememberCoroutineScope()

    LaunchedEffect(autenticado) {
        if (autenticado) onIngresoExitoso()
    }

    LoginScreen(
        uiState = uiState,
        onCorreoCambiado = viewModel::onCorreoCambiado,
        onContrasenaCambiada = viewModel::onContrasenaCambiada,
        onCambiarVisibilidadContrasena = viewModel::onCambiarVisibilidadContrasena,
        onIngresarClick = viewModel::ingresar,
        onOlvideClaveClick = onOlvideClave,
        onRegistrarmeClick = onRegistrarme,
        onIngresoBiometricoClick = {
            alcance.launch {
                val resultado = gestorBiometria.autenticar(
                    activity = activity,
                    titulo = "Ingreso con biometría",
                    subtitulo = "Confirme su identidad con huella o rostro",
                    negativo = "Usar usuario y contraseña",
                )
                viewModel.onResultadoBiometria(resultado)
            }
        },
    )
}
