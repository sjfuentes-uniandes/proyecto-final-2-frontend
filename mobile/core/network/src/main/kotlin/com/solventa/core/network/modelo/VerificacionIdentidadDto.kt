package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/**
 * Respuesta 200 de `POST /v1/identidad/verificaciones`. `estado` y `resultado` se dejan como
 * texto (VERIFICADO | PENDIENTE | RECHAZADO y APROBADO | CAPTURA_INVALIDA | RECHAZADO) para que un
 * valor nuevo del backend no rompa la deserialización; el cliente los interpreta.
 */
@Serializable
data class VerificacionIdentidadDto(
    val clienteId: String,
    val estado: String,
    val resultado: String,
    val motivo: String? = null,
    val verificadoEn: String? = null,
)
