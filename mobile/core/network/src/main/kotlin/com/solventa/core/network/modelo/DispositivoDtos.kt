package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/** HU-M11 (contrato bff-movil.yaml): el titular es el del token; el cuerpo solo lleva el token push. */
@Serializable
data class SolicitudRegistroDispositivoDto(val token: String) {
    // El token push es un dato sensible: nunca debe salir en trazas.
    override fun toString(): String = "SolicitudRegistroDispositivoDto(token=***)"
}

@Serializable
data class DispositivoDto(val dispositivoId: String) {
    override fun toString(): String = "DispositivoDto(dispositivoId=***)"
}
