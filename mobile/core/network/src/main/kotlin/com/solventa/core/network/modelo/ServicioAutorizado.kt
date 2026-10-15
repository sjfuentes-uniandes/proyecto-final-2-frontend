package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/** Igual al enum `ServicioAutorizado` del contrato bff-movil.yaml. */
@Serializable
enum class ServicioAutorizado {
    POLIZAS,
    SINIESTROS,
    PRIVACIDAD,
    VERIFICACION_IDENTIDAD,
}
