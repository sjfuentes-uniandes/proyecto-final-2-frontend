package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/** Resultado del reto de vida hecho en el dispositivo; el backend lo reenvía al proveedor KYC. */
@Serializable
data class PruebaDeVidaDto(val completado: Boolean)

/**
 * Cuerpo de `POST /v1/identidad/verificaciones` (contrato bff-movil.yaml). `selfie` va en base64
 * y mide como máximo [MAX_CARACTERES_SELFIE]. Nunca se imprime: `toString` la oculta para que un
 * log accidental no filtre la evidencia biométrica.
 */
@Serializable
data class VerificacionIdentidadSolicitud(
    val selfie: String,
    val pruebaDeVida: PruebaDeVidaDto,
) {
    override fun toString(): String = "VerificacionIdentidadSolicitud(selfie=<redactada>, pruebaDeVida=$pruebaDeVida)"

    companion object {
        const val MAX_CARACTERES_SELFIE = 5_000_000
    }
}
