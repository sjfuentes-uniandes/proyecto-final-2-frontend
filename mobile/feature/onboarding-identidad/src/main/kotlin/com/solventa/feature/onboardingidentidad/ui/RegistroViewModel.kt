package com.solventa.feature.onboardingidentidad.ui

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Datos del formulario de registro y su validación. La contraseña se valida con la misma política
 * del pool `clientes` de Cognito para no esperar a que el SignUp la rechace.
 */
data class RegistroUiState(
    val correo: String = "",
    val contrasena: String = "",
    val confirmacion: String = "",
    val contrasenaVisible: Boolean = false,
    val confirmacionVisible: Boolean = false,
    val correoRequerido: Boolean = false,
) {
    val correoValido: Boolean
        get() = PATRON_CORREO.matches(correo.trim())

    /** El error del correo aparece al escribir algo inválido o al intentar registrar la biometría sin correo. */
    val mostrarErrorCorreo: Boolean
        get() = !correoValido && (correo.isNotEmpty() || correoRequerido)

    val contrasenaValida: Boolean
        get() = cumplePoliticaContrasena(contrasena)

    val mostrarErrorContrasena: Boolean
        get() = contrasena.isNotEmpty() && !contrasenaValida

    /** No se marca error mientras la confirmación esté vacía. */
    val contrasenasCoinciden: Boolean
        get() = confirmacion.isEmpty() || contrasena == confirmacion

    fun puedeRegistrar(identidadVerificada: Boolean): Boolean =
        identidadVerificada &&
            correoValido &&
            contrasenaValida &&
            confirmacion == contrasena

    private companion object {
        val PATRON_CORREO = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
    }
}

/** Mínimo 10 caracteres con mayúscula, minúscula y número (política del pool `clientes`). */
internal fun cumplePoliticaContrasena(contrasena: String): Boolean =
    contrasena.length >= 10 &&
        contrasena.any { it.isUpperCase() } &&
        contrasena.any { it.isLowerCase() } &&
        contrasena.any { it.isDigit() }

/** Guarda el formulario fuera de la composición: las contraseñas no deben ir al estado guardado de la actividad. */
class RegistroViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(RegistroUiState())
    val uiState: StateFlow<RegistroUiState> = _uiState.asStateFlow()

    fun onCorreoCambiado(valor: String) = _uiState.update { it.copy(correo = valor, correoRequerido = false) }

    /** Se intentó registrar la biometría sin un correo válido: la verificación va ligada al correo. */
    fun marcarCorreoRequerido() = _uiState.update { it.copy(correoRequerido = true) }

    fun onContrasenaCambiada(valor: String) = _uiState.update { it.copy(contrasena = valor) }

    fun onConfirmacionCambiada(valor: String) = _uiState.update { it.copy(confirmacion = valor) }

    fun onCambiarVisibilidadContrasena() = _uiState.update { it.copy(contrasenaVisible = !it.contrasenaVisible) }

    fun onCambiarVisibilidadConfirmacion() = _uiState.update { it.copy(confirmacionVisible = !it.confirmacionVisible) }

    /** Borra el formulario, incluidas las contraseñas, al salir del registro. */
    fun limpiar() {
        _uiState.value = RegistroUiState()
    }
}
