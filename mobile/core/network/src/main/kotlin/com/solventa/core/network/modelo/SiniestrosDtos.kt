package com.solventa.core.network.modelo

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable

@Serializable
data class LimitesSiniestrosDto(
    val maxEvidencias: Int,
    val formatosFoto: List<String>,
    val formatosVideo: List<String>,
    val tamanoMaximoFotoBytes: Long,
    val tamanoMaximoVideoBytes: Long,
    val duracionMaximaVideoSegundos: Int,
    val urlCargaExpiraSegundos: Int,
    val ubicacionObligatoria: Boolean? = null,
    val ubicacionTiposOpcionales: List<String>? = null,
    val ubicacionPrecisionMaxM: Double? = null,
)

@Serializable
data class ListadoBorradoresDto(val items: List<BorradorResumenDto>)

@Serializable
data class BorradorResumenDto(
    val borradorId: String,
    val polizaId: String,
    val descripcion: String,
    val estado: String,
    val creadoEn: String,
    val cantidadEvidencias: Int,
    val evidenciasPendientes: Int,
    val ubicacion: UbicacionReporteDto? = null,
)

@Serializable
data class BorradorDto(
    val borradorId: String,
    val polizaId: String,
    val estado: String,
)

@Serializable
data class BorradorDetalleDto(
    val borradorId: String,
    val polizaId: String,
    val descripcion: String,
    val estado: String,
    val creadoEn: String,
    val cantidadEvidencias: Int,
    val evidenciasPendientes: Int,
    val evidencias: List<EvidenciaBorradorDto>,
    val causa: String? = null,
    val fechaEvento: String? = null,
    val envio: EnvioSiniestroDto? = null,
    val ubicacion: UbicacionReporteDto? = null,
)

@Serializable
data class ActualizacionBorradorDto(
    val descripcion: String? = null,
    val causa: String? = null,
    val fechaEvento: String? = null,
    val ubicacion: UbicacionCapturadaDto? = null,
)

@Serializable
enum class PermisoUbicacionDto { PRECISO, APROXIMADO, DENEGADO, DENEGADO_PERMANENTEMENTE, NO_SOLICITADO }

@Serializable
enum class EstadoUbicacionDto { DISPONIBLE, NO_CONFIABLE, NO_DISPONIBLE }

@Serializable
data class UbicacionCapturadaDto(
    val permiso: PermisoUbicacionDto,
    val lat: Double? = null,
    val lon: Double? = null,
    val precisionM: Double? = null,
    val capturadaEn: String? = null,
) {
    override fun toString() = "UbicacionCapturadaDto(permiso=$permiso)"
}

@Serializable
data class UbicacionReporteDto(
    val permiso: PermisoUbicacionDto,
    val estado: EstadoUbicacionDto,
    val lat: Double? = null,
    val lon: Double? = null,
    val precisionM: Double? = null,
    val capturadaEn: String? = null,
) {
    override fun toString() = "UbicacionReporteDto(permiso=$permiso, estado=$estado)"
}

@Serializable
data class EnvioSiniestroDto(
    val borradorId: String,
    val siniestroId: String,
    val codigo: String,
    val estado: String,
    val reportadoEn: String,
)

@Serializable
data class SiniestroResumenDto(
    val siniestroId: String,
    val codigo: String,
    val estado: String,
    val polizaId: String,
    val reportadoEn: String,
)

@Serializable
data class ListadoSiniestrosDto(val items: List<SiniestroResumenDto>, val siguienteCursor: String?)

@Serializable
data class SiniestroDetalleDto(
    val siniestroId: String,
    val codigo: String,
    val estado: String,
    val polizaId: String,
    val reportadoEn: String,
    val descripcion: String?,
    val causa: String,
    val fechaEvento: String,
    val evidencias: List<EvidenciaReporteDto>,
    val historial: List<HitoReporteDto>,
    val ubicacion: UbicacionReporteDto? = null,
)

@Serializable
data class EnlaceEvidenciaDto(
    val url: String,
    val expiraEn: String,
    val nombreArchivo: String,
    val tipoContenido: String,
)

@Serializable
data class EvidenciaReporteDto(
    val evidenciaId: String,
    val nombreArchivo: String,
    val tipo: String,
    val tipoContenido: String?,
    val tamanoBytes: Long?,
    val capturadaEn: String?,
)

@Serializable
data class HitoReporteDto(
    val accion: String,
    val estadoAnterior: String?,
    val estadoNuevo: String?,
    val ocurridoEn: String,
)

@Serializable
data class EvidenciaBorradorDto(
    val evidenciaId: String,
    val nombreArchivo: String,
    val tipo: String,
    val tipoContenido: String,
    val tamanoBytes: Long,
    val sha256: String,
    val capturadaEn: String? = null,
    val duracionSegundos: Int? = null,
    val estadoCarga: String,
    val cargaConfirmadaEn: String? = null,
)

@Serializable
data class SolicitudBorradorDto(
    val polizaId: String,
    val descripcion: String,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class SolicitudFotoEvidenciaDto(
    val nombreArchivo: String,
    @EncodeDefault
    val tipo: String = "FOTOGRAFIA",
    val tipoContenido: String,
    val tamanoBytes: Long,
    val sha256: String,
    val capturadaEn: String? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class SolicitudVideoEvidenciaDto(
    val nombreArchivo: String,
    @EncodeDefault
    val tipo: String = "VIDEO",
    val tipoContenido: String,
    val tamanoBytes: Long,
    val sha256: String,
    val capturadaEn: String? = null,
    val duracionSegundos: Int,
)

@Serializable
data class CargaDto(
    val metodo: String,
    val url: String,
    val campos: Map<String, String>,
    val expiraEn: String,
)

@Serializable
data class EvidenciaDto(
    val evidenciaId: String,
    val nombreArchivo: String,
    val tipo: String,
    val tipoContenido: String,
    val tamanoBytes: Long,
    val sha256: String,
    val capturadaEn: String? = null,
    val duracionSegundos: Int? = null,
    val estadoCarga: String,
    val cargaConfirmadaEn: String? = null,
    val carga: CargaDto,
)

@Serializable
data class EvidenciaConfirmadaDto(
    val evidenciaId: String,
    val estadoCarga: String,
    val cargaConfirmadaEn: String,
)

@Serializable
data class CargaRenovadaDto(
    val evidenciaId: String,
    val estadoCarga: String,
    val carga: CargaDto,
)
