package com.solventa.feature.siniestros.dominio

import java.time.OffsetDateTime
import java.time.format.DateTimeParseException

enum class PermisoUbicacion { PRECISO, APROXIMADO, DENEGADO, DENEGADO_PERMANENTEMENTE, NO_SOLICITADO }
enum class EstadoUbicacion { DISPONIBLE, NO_CONFIABLE, NO_DISPONIBLE }
enum class MotivoSinUbicacion { DESACTIVADA, SIN_LECTURA, TIEMPO_AGOTADO, ERROR }

data class ReglasUbicacion(val obligatoria: Boolean, val tiposOpcionales: List<String>, val precisionMaxM: Double) {
    fun requiere(causa: String?) = obligatoria && causa !in tiposOpcionales
}

data class UbicacionCapturada(
    val permiso: PermisoUbicacion,
    val lat: Double? = null,
    val lon: Double? = null,
    val precisionM: Double? = null,
    val capturadaEn: String? = null,
) {
    fun esValida(): Boolean {
        val tieneLectura = listOf(lat, lon, precisionM, capturadaEn).any { it != null }
        if (!tieneLectura) return true
        if (permiso != PermisoUbicacion.PRECISO && permiso != PermisoUbicacion.APROXIMADO) return false
        if (lat == null || !lat.isFinite() || lat !in -90.0..90.0 ||
            lon == null || !lon.isFinite() || lon !in -180.0..180.0 ||
            precisionM == null || !precisionM.isFinite() || precisionM <= 0 || capturadaEn == null
        ) return false
        return try {
            OffsetDateTime.parse(capturadaEn)
            true
        } catch (_: DateTimeParseException) { false }
    }

    override fun toString() = "UbicacionCapturada(permiso=$permiso)"
}

data class UbicacionReporte(val lectura: UbicacionCapturada, val estado: EstadoUbicacion) {
    fun esConfiable(reglas: ReglasUbicacion): Boolean =
        estado == EstadoUbicacion.DISPONIBLE && lectura.esValida() &&
            lectura.precisionM?.let { it <= reglas.precisionMaxM } == true
    override fun toString() = "UbicacionReporte(permiso=${lectura.permiso}, estado=$estado)"
}

data class CapturaUbicacion(val lectura: UbicacionCapturada, val motivo: MotivoSinUbicacion? = null)

interface ProveedorUbicacion {
    fun permisoActual(): PermisoUbicacion
    fun registrarRespuesta(permanente: Boolean)
    suspend fun capturar(): CapturaUbicacion
}
