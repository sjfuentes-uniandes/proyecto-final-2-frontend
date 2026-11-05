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
    val tipoDocumento: String = "CC",
    val numeroDocumento: String = "",
    val correo: String = "",
    val contrasena: String = "",
    val confirmacion: String = "",
    val contrasenaVisible: Boolean = false,
    val confirmacionVisible: Boolean = false,
    val correoRequerido: Boolean = false,
) {
    val tipoDocumentoValido: Boolean
        get() = PATRON_TIPO_DOCUMENTO.matches(tipoDocumento)

    val numeroDocumentoValido: Boolean
        get() = PATRON_NUMERO_DOCUMENTO.matches(numeroDocumento.trim())

    val mostrarErrorTipoDocumento: Boolean
        get() = !tipoDocumentoValido && (tipoDocumento.isNotEmpty() || correoRequerido)

    val mostrarErrorNumeroDocumento: Boolean
        get() = !numeroDocumentoValido && (numeroDocumento.isNotEmpty() || correoRequerido)

    /** Los tres datos que ligan la verificación a un cliente, antes de pedir la selfie. */
    val datosVerificacionValidos: Boolean
        get() = tipoDocumentoValido && numeroDocumentoValido && correoValido

    val correoValido: Boolean
        get() = correo.trim().length in 3..254 && PATRON_CORREO.matches(correo.trim())

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
            datosVerificacionValidos &&
            contrasenaValida &&
            confirmacion == contrasena

    private companion object {
        val PATRON_CORREO = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
        val PATRON_TIPO_DOCUMENTO = Regex("^[A-Z]{2,3}$")
        val PATRON_NUMERO_DOCUMENTO = Regex("^[A-Za-z0-9]{3,20}$")
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

    fun onTipoDocumentoCambiado(valor: String) =
        _uiState.update { it.copy(tipoDocumento = valor.uppercase().trim().take(3), correoRequerido = false) }

    fun onNumeroDocumentoCambiado(valor: String) =
        _uiState.update { it.copy(numeroDocumento = valor.filter { c -> !c.isWhitespace() }.take(20), correoRequerido = false) }

    fun onCorreoCambiado(valor: String) = _uiState.update { it.copy(correo = valor, correoRequerido = false) }

    /** Se intentó registrar la biometría sin datos válidos: la verificación va ligada al documento y al correo. */
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
