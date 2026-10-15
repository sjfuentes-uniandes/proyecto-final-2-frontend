package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/** `SesionDto` del contrato bff-movil.yaml (GET /v1/sesion, 200). */
@Serializable
data class SesionDto(
    val clienteId: String,
    val serviciosAutorizados: List<ServicioAutorizado>,
    val expiraEn: String,
)
