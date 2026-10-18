package com.solventa.feature.onboardingidentidad.verificacion

import java.util.UUID

/**
 * Estado del registro en curso que debe sobrevivir a varias pantallas (formulario, captura,
 * confirmación del correo, ingreso y vinculación). Solo vive en memoria: nunca guarda la selfie.
 *
 * El [registroId] se genera una vez y se reutiliza en todos los reintentos para que el backend no
 * cree un segundo cliente; es un secreto de la sesión de registro y no debe registrarse en logs.
 */
class SesionRegistro(private val generarId: () -> String = { UUID.randomUUID().toString() }) {
    var registroId: String = generarId()
        private set

    /** Correo del formulario; el backend liga la verificación a este correo. */
    var correo: String = ""

    var tokenRegistro: String? = null
        private set

    fun guardarToken(token: String) {
        tokenRegistro = token
    }

    /** Descarta la verificación (por ejemplo, si cambia el correo): el siguiente envío usa un `registroId` nuevo. */
    fun reiniciar() {
        registroId = generarId()
        tokenRegistro = null
    }

    override fun toString(): String = "SesionRegistro(registroId=<redactado>, tokenRegistro=<redactado>)"
}
