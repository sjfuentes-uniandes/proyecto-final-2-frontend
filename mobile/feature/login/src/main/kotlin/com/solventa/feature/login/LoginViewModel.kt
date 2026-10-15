package com.solventa.feature.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.ResultadoSesion
import com.solventa.core.security.Disponibilidad
import com.solventa.core.security.GestorBiometria
import com.solventa.core.security.ResultadoBiometria
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Orquesta la pantalla de ingreso: credenciales contra [GestorSesion] y, si el dispositivo lo
 * permite, el desbloqueo biométrico. El diálogo de `BiometricPrompt` en sí lo dispara la UI (hace
 * falta la `FragmentActivity`); este ViewModel solo decide qué mostrar y qué hacer con el
 * resultado ([onResultadoBiometria]).
 *
 * Un ingreso (con credenciales o biometría) solo se da por completo (AC1) cuando, además de que
 * Cognito acepte la sesión, `bff-movil` confirma con `GET /v1/sesion` que el servidor la
 * reconoce. Un `GestorSesion` "autenticado" localmente no basta: lo único que garantiza que el
 * servidor no revocó la sesión (AC4) es esa llamada.
 */
class LoginViewModel(
    private val gestorSesion: GestorSesion,
    private val gestorBiometria: GestorBiometria,
    private val bffMovilCliente: BffMovilCliente,
) : ViewModel() {
    private val _uiState = MutableStateFlow(
        LoginUiState(mostrarBiometria = biometriaOfrecible()),
    )
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

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
            if (resultado is ResultadoAutenticacion.Exito) {
                validarSesionConServidor()
            } else {
                _uiState.update { it.copy(cargando = false, errorCredenciales = mensajeError(resultado)) }
            }
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
            if (restaurada) {
                validarSesionConServidor()
            } else {
                // El SDK de Cognito ya no tiene en caché una sesión válida para este usuario
                // (refresh token vencido o revocado localmente); como mostrarBiometria exige que
                // antes haya existido una sesión guardada, esto sí es una sesión que dejó de
                // servir, no una instalación nueva.
                bloquearBiometria(MensajeLogin.SesionRevocada)
            }
        }
    }

    /** AC1/AC4: el único punto donde se confirma con el servidor que la sesión sigue vigente. */
    private suspend fun validarSesionConServidor() {
        when (val resultado = bffMovilCliente.consultarSesion()) {
            is ResultadoSesion.Exito -> _uiState.update { it.copy(cargando = false, ingresoCompleto = true) }
            is ResultadoSesion.NoAutenticado -> {
                // AC4: el servidor sí rechazó la sesión (401 NO_AUTENTICADO); se limpia la
                // sesión local de Cognito para no quedar en un estado inconsistente.
                gestorSesion.cerrarSesion()
                bloquearBiometria(MensajeLogin.SesionRevocada)
            }
            else -> {
                // Error de red, 503, 403/404/422, etc.: no es una revocación confirmada, así que
                // no se presenta como tal; se deja reintentar sin forzar un re-ingreso completo.
                _uiState.update { it.copy(cargando = false, mensaje = MensajeLogin.ErrorVerificacion) }
            }
        }
    }

    private fun bloquearBiometria(mensaje: MensajeLogin) {
        _uiState.update { it.copy(mostrarBiometria = false, mensaje = mensaje, cargando = false) }
    }

    /** AC3: solo se ofrece biometría si el dispositivo la soporta y hay una sesión guardada. */
    private fun biometriaOfrecible(): Boolean =
        gestorBiometria.disponibilidad() == Disponibilidad.DISPONIBLE && gestorSesion.haySesionGuardada()

    private fun mensajeError(resultado: ResultadoAutenticacion): TextoLogin? = when (resultado) {
        is ResultadoAutenticacion.Exito -> null
        ResultadoAutenticacion.CredencialesInvalidas -> TextoLogin.Recurso(R.string.login_error_credenciales_invalidas)
        ResultadoAutenticacion.UsuarioNoConfirmado -> TextoLogin.Recurso(R.string.login_error_usuario_no_confirmado)
        ResultadoAutenticacion.IntentosExcedidos -> TextoLogin.Recurso(R.string.login_error_intentos_excedidos)
        ResultadoAutenticacion.CodigoMfaRequerido -> TextoLogin.Recurso(R.string.login_error_mfa_no_soportado)
        ResultadoAutenticacion.SesionNoDisponible -> TextoLogin.Recurso(R.string.login_error_sesion_no_disponible)
        // Mensaje de diagnóstico dinámico (p. ej. "Falta configurar Cognito..." del
        // ClienteIdentidad de respaldo, o el texto crudo de una excepción): no se traduce.
        is ResultadoAutenticacion.SinConexion -> TextoLogin.Dinamico(resultado.mensaje)
        is ResultadoAutenticacion.ErrorDesconocido -> TextoLogin.Dinamico(resultado.mensaje)
    }

    private companion object {
        const val LIMITE_INTENTOS_BIOMETRICOS = 3
    }
}
