package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/** Cuerpo de `POST /v1/registro/verificaciones`. La selfie y el correo no se imprimen en `toString`. */
@Serializable
data class RegistroVerificacionSolicitud(
    val registroId: String,
    val correo: String,
    val selfie: String,
    val pruebaDeVida: PruebaDeVidaDto,
) {
    override fun toString(): String =
        "RegistroVerificacionSolicitud(registroId=<redactado>, correo=<redactado>, selfie=<redactada>, pruebaDeVida=$pruebaDeVida)"
}

@Serializable
data class RegistroVerificacionDto(
    val clienteId: String,
    val estado: String,
    val resultado: String,
    val motivo: String? = null,
    val verificadoEn: String? = null,
    val tokenRegistro: String? = null,
    val expiraEn: String? = null,
) {
    override fun toString(): String =
        "RegistroVerificacionDto(estado=$estado, resultado=$resultado, motivo=$motivo, tokenRegistro=<redactado>)"
}

/** Cuerpo de `POST /v1/registro/vinculacion`. */
@Serializable
data class VinculacionSolicitud(val registroId: String, val tokenRegistro: String) {
    override fun toString(): String = "VinculacionSolicitud(registroId=<redactado>, tokenRegistro=<redactado>)"
}

@Serializable
data class VinculacionDto(
    val clienteId: String,
    val estado: String,
    val verificadoEn: String? = null,
)

/** Cuerpo de `POST /v1/registro/validaciones` (solo backend local: simula el pre sign-up de Cognito). */
@Serializable
data class ValidacionRegistroSolicitud(val tokenRegistro: String, val correo: String) {
    override fun toString(): String = "ValidacionRegistroSolicitud(tokenRegistro=<redactado>, correo=<redactado>)"
}

@Serializable
data class ValidacionRegistroDto(val valido: Boolean, val expiraEn: String? = null)
