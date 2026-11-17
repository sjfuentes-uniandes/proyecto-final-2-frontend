package com.solventa.feature.siniestros.dominio

import java.io.File

data class LimitesSiniestros(
    val maxEvidencias: Int,
    val formatosFoto: List<String>,
    val formatosVideo: List<String>,
    val tamanoMaximoFotoBytes: Long,
    val tamanoMaximoVideoBytes: Long,
    val duracionMaximaVideoSegundos: Int,
    val urlCargaExpiraSegundos: Int,
)

data class BorradorResumen(
    val id: String,
    val polizaId: String,
    val descripcion: String,
    val estado: String,
    val creadoEn: String,
    val cantidadEvidencias: Int,
    val evidenciasPendientes: Int,
)

data class Borrador(
    val id: String,
    val polizaId: String,
    val estado: String,
)

data class Evidencia(
    val id: String,
    val nombreArchivo: String,
    val tipo: TipoEvidencia,
    val tipoContenido: String,
    val tamanoBytes: Long,
    val estadoCarga: EstadoCarga,
    val capturadaEn: String?,
    val duracionSegundos: Int?,
)

data class BorradorDetalle(
    val id: String,
    val polizaId: String,
    val descripcion: String,
    val estado: String,
    val creadoEn: String,
    val cantidadEvidencias: Int,
    val evidenciasPendientes: Int,
    val evidencias: List<Evidencia>,
)

data class EvidenciaTemporal(
    val id: String,
    val archivo: File,
    val tipo: TipoEvidencia,
    val capturadaEn: String,
    val duracionSegundos: Int? = null,
    val evidenciaIdServidor: String? = null,
)

enum class TipoEvidencia {
    FOTOGRAFIA,
    VIDEO,
    DESCONOCIDO,
}

enum class EstadoCarga {
    PENDIENTE,
    CARGADA,
    DESCONOCIDO,
}

sealed interface Resultado<out T> {
    data class Exito<T>(val valor: T) : Resultado<T>
    data class Fallo(val causa: FalloSiniestros) : Resultado<Nothing>
}

sealed interface FalloSiniestros {
    val reintentable: Boolean get() = false

    data object SinConexion : FalloSiniestros {
        override val reintentable = true
    }

    data object SesionVencida : FalloSiniestros
    data object NoAutorizado : FalloSiniestros
    data object PolizaNoAutorizada : FalloSiniestros
    data object PolizaNoEncontrada : FalloSiniestros
    data object BorradorNoEncontrado : FalloSiniestros
    data object PolizaNoVigente : FalloSiniestros
    data object SolicitudInvalida : FalloSiniestros
    data object IdempotenciaConflicto : FalloSiniestros
    data object TipoEvidenciaNoAdmitido : FalloSiniestros
    data object TamanoEvidenciaExcedido : FalloSiniestros
    data object DuracionVideoExcedida : FalloSiniestros
    data object LimiteEvidenciasAlcanzado : FalloSiniestros
    data object IntegridadEvidenciaInvalida : FalloSiniestros
    data object ServicioNoDisponible : FalloSiniestros {
        override val reintentable = true
    }

    data object CargaS3Fallida : FalloSiniestros {
        override val reintentable = true
    }

    data object RespuestaInvalida : FalloSiniestros {
        override val reintentable = true
    }

    data object DescripcionObligatoria : FalloSiniestros
    data object DescripcionDemasiadoLarga : FalloSiniestros
    data object EvidenciaNoAdmitida : FalloSiniestros
    data object ArchivoNoDisponible : FalloSiniestros
}

interface RepositorioSiniestros {
    suspend fun limites(): Resultado<LimitesSiniestros>
    suspend fun listar(): Resultado<List<BorradorResumen>>
    suspend fun detalle(borradorId: String): Resultado<BorradorDetalle>
    suspend fun crearBorrador(polizaId: String, descripcion: String, claveIdempotencia: String): Resultado<Borrador>
    suspend fun agregarEvidencia(
        borradorId: String,
        evidencia: EvidenciaTemporal,
        limites: LimitesSiniestros,
    ): Resultado<Evidencia>
}

interface AlmacenEvidencias {
    fun crearArchivo(extension: String): File
    fun eliminar(archivo: File)
}
