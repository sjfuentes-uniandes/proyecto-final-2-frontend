package com.solventa.feature.login

/** Estado de la pantalla de ingreso (credenciales + biometría). */
data class LoginUiState(
    val correo: String = "",
    val contrasena: String = "",
    val contrasenaVisible: Boolean = false,
    val cargando: Boolean = false,
    /** Si se oculta el panel "Ingreso biométrico" (AC3: no disponible o límite superado). */
    val mostrarBiometria: Boolean = false,
    val mensaje: MensajeLogin? = null,
    val errorCredenciales: String? = null,
) {
    val puedeIngresar: Boolean
        get() = !cargando && correo.isNotBlank() && contrasena.isNotBlank()
}
