package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/**
 * `ConsentimientoDto` del contrato bff-movil.yaml (HU-M08). Fechas ISO-8601 en UTC, tal como las
 * envía el servidor; la conversión a la zona del usuario es de la presentación.
 *
 * `estado` es texto y no un enum: un valor que esta versión no conozca no rompe la lectura de la
 * lista (la app N-1 sigue funcionando contra el backend N); lo decide quien mapea al dominio.
 */
@Serializable
data class ConsentimientoDto(
    val consentimientoId: String,
    val estado: String,
    val proposito: String,
    val alcances: List<String>,
    val versionTexto: String,
    val idioma: String,
    val otorgadoEn: String,
    val vigenteHasta: String,
    val revocadoEn: String? = null,
)

/** `SolicitudOtorgar` del contrato: el servidor calcula `vigenteHasta` (ADR 0005). */
@Serializable
data class SolicitudOtorgarDto(
    val proposito: String,
    val alcances: List<String>,
    val vigenciaMeses: Int,
    val versionTexto: String,
    val idioma: String,
)

/** `TextoVigenteDto` del contrato: texto de ejemplo, sin validez legal (ADR 0005). */
@Serializable
data class TextoVigenteDto(
    val proposito: String,
    val idioma: String,
    val versionTexto: String,
    val titulo: String,
    val cuerpo: String,
    val aviso: String,
    val vigenciasMeses: List<Int>,
    val vigenciaDefectoMeses: Int,
)

/**
 * `HistorialDto` del contrato (HU-M09): cuándo se otorgó y, si aplica, cuándo se revocó o venció.
 * `estado` y `tipo` son texto por la misma razón que en [ConsentimientoDto]: un valor nuevo del
 * backend no rompe la lectura.
 */
@Serializable
data class HistorialDto(
    val consentimientoId: String,
    val estado: String,
    val hitos: List<HitoDto>,
)

/** Un hito del historial: `tipo` (OTORGADO, REVOCADO o VENCIDO) y su instante ISO-8601 en UTC. */
@Serializable
data class HitoDto(
    val tipo: String,
    val ocurridoEn: String,
)
