package com.solventa.feature.login

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.res.stringResource
import androidx.fragment.app.FragmentActivity
import com.solventa.core.security.GestorBiometria
import kotlinx.coroutines.launch

/**
 * Conecta [LoginScreen] con [LoginViewModel] y dispara el diálogo de `BiometricPrompt` (hace
 * falta la Activity en pantalla, por eso vive aquí y no en el ViewModel). Navega a
 * [onIngresoExitoso] en cuanto el servidor confirma la sesión (`uiState.ingresoCompleto`, AC1).
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
    val alcance = rememberCoroutineScope()

    LaunchedEffect(Unit) { viewModel.alMostrarse() }

    LaunchedEffect(uiState.ingresoCompleto) {
        if (uiState.ingresoCompleto) onIngresoExitoso()
    }

    // Se resuelven aquí (en composición) porque `gestorBiometria.autenticar` es una función
    // suspend que corre fuera de composición: `stringResource` no se puede llamar allá dentro.
    val tituloBiometria = stringResource(R.string.login_boton_biometria)
    val subtituloBiometria = stringResource(R.string.login_biometria_subtitulo)
    val negativoBiometria = stringResource(R.string.login_biometria_negativo)

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
                    titulo = tituloBiometria,
                    subtitulo = subtituloBiometria,
                    negativo = negativoBiometria,
                )
                viewModel.onResultadoBiometria(resultado)
            }
        },
    )
}
