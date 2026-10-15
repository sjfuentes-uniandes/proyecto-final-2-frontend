package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/**
 * `ErrorDto` del contrato bff-movil.yaml: formato estable de error (acuerdos/codigos-error.md).
 * Los clientes traducen por `codigo`, nunca por `mensaje`.
 */
@Serializable
data class ErrorDto(
    val codigo: String,
    val mensaje: String,
    val correlationId: String? = null,
    val detalles: JsonObject = JsonObject(emptyMap()),
)
