package com.solventa.feature.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.core.auth.EstadoSesion
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.security.Disponibilidad
import com.solventa.core.security.GestorBiometria
import com.solventa.core.security.ResultadoBiometria
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Orquesta la pantalla de ingreso: credenciales contra [GestorSesion] y, si el dispositivo lo
 * permite, el desbloqueo biométrico. El diálogo de `BiometricPrompt` en sí lo dispara la UI (hace
 * falta la `FragmentActivity`); este ViewModel solo decide qué mostrar y qué hacer con el
 * resultado ([onResultadoBiometria]).
 */
class LoginViewModel(
    private val gestorSesion: GestorSesion,
    private val gestorBiometria: GestorBiometria,
) : ViewModel() {
    private val _uiState = MutableStateFlow(
        LoginUiState(mostrarBiometria = gestorBiometria.disponibilidad() == Disponibilidad.DISPONIBLE),
    )
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    /** AC1: en cuanto haya una sesión autenticada, la UI navega a los servicios del cliente. */
    val sesionActiva: StateFlow<Boolean> = gestorSesion.estado
        .map { it is EstadoSesion.Autenticada }
        .stateIn(viewModelScope, SharingStarted.Eagerly, gestorSesion.estado.value is EstadoSesion.Autenticada)

    private var intentosBiometricosFallidos = 0

    fun onCorreoCambiado(valor: String) {
        _uiState.update { it.copy(correo = valor, errorCredenciales = null) }
    }

    fun onContrasenaCambiada(valor: String) {
        _uiState.update { it.copy(contrasena = valor, errorCredenciales = null) }
    }

    fun onCambiarVisibilidadContrasena() {
        _uiState.update { it.copy(contrasenaVisible = !it.contrasenaVisible) }
    }

    fun ingresar() {
        if (!_uiState.value.puedeIngresar) return
        viewModelScope.launch {
            _uiState.update { it.copy(cargando = true, errorCredenciales = null) }
            val resultado = gestorSesion.iniciarSesion(_uiState.value.correo.trim(), _uiState.value.contrasena)
            _uiState.update { it.copy(cargando = false, errorCredenciales = mensajeError(resultado)) }
        }
    }

    /** Llamar tras mostrar `GestorBiometria.autenticar(...)` desde la UI, con su resultado. */
    fun onResultadoBiometria(resultado: ResultadoBiometria) {
        when (resultado) {
            ResultadoBiometria.Exito -> restaurarSesionTrasBiometria()
            ResultadoBiometria.Cancelado -> Unit
            ResultadoBiometria.Bloqueado -> bloquearBiometria(MensajeLogin.LimiteBiometriaSuperado)
            is ResultadoBiometria.Error -> {
                intentosBiometricosFallidos++
                if (intentosBiometricosFallidos >= LIMITE_INTENTOS_BIOMETRICOS) {
                    bloquearBiometria(MensajeLogin.LimiteBiometriaSuperado)
                } else {
                    _uiState.update { it.copy(mensaje = MensajeLogin.ReintentarBiometria) }
                }
            }
        }
    }

    private fun restaurarSesionTrasBiometria() {
        viewModelScope.launch {
            intentosBiometricosFallidos = 0
            _uiState.update { it.copy(cargando = true, mensaje = null) }
            val restaurada = gestorSesion.restaurarSesion()
            _uiState.update { it.copy(cargando = false) }
            if (!restaurada) {
                // AC4: el servidor ya rechazó la sesión que la biometría local acababa de
                // desbloquear (revocada, token inválido, etc.); hace falta credenciales completas.
                bloquearBiometria(MensajeLogin.SesionRevocada)
            }
        }
    }

    private fun bloquearBiometria(mensaje: MensajeLogin) {
        _uiState.update { it.copy(mostrarBiometria = false, mensaje = mensaje, cargando = false) }
    }

    private fun mensajeError(resultado: ResultadoAutenticacion): String? = when (resultado) {
        is ResultadoAutenticacion.Exito -> null
        ResultadoAutenticacion.CredencialesInvalidas -> "Usuario o contraseña incorrectos"
        ResultadoAutenticacion.UsuarioNoConfirmado -> "Confirme su cuenta antes de ingresar"
        ResultadoAutenticacion.IntentosExcedidos -> "Demasiados intentos. Inténtelo más tarde"
        ResultadoAutenticacion.CodigoMfaRequerido -> "Esta cuenta requiere un código adicional no disponible aún en la app"
        ResultadoAutenticacion.SesionNoDisponible -> "Ingrese su usuario y contraseña"
        // El mensaje ya viene listo para mostrar (p. ej. "Falta configurar Cognito..." del
        // ClienteIdentidad de respaldo); no se debe reemplazar por uno genérico.
        is ResultadoAutenticacion.SinConexion -> resultado.mensaje
        is ResultadoAutenticacion.ErrorDesconocido -> resultado.mensaje
    }

    private companion object {
        const val LIMITE_INTENTOS_BIOMETRICOS = 3
    }
}
