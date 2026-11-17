package com.solventa.core.network.modelo

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

@Serializable
data class SolicitudFotoEvidenciaDto(
    val nombreArchivo: String,
    val tipo: String = "FOTOGRAFIA",
    val tipoContenido: String,
    val tamanoBytes: Long,
    val sha256: String,
    val capturadaEn: String? = null,
)

@Serializable
data class SolicitudVideoEvidenciaDto(
    val nombreArchivo: String,
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
