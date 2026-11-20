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
    val reglasUbicacion: ReglasUbicacion? = null,
)

data class BorradorResumen(
    val id: String,
    val polizaId: String,
    val descripcion: String,
    val estado: String,
    val creadoEn: String,
    val cantidadEvidencias: Int,
    val evidenciasPendientes: Int,
    val ubicacion: UbicacionReporte? = null,
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
    val causa: String? = null,
    val fechaEvento: String? = null,
    val envio: EnvioSiniestro? = null,
    val ubicacion: UbicacionReporte? = null,
)

data class EnvioSiniestro(
    val borradorId: String,
    val siniestroId: String,
    val codigo: String,
    val estado: String,
    val reportadoEn: String,
)

data class SiniestroResumen(
    val id: String,
    val codigo: String,
    val estado: String,
    val polizaId: String,
    val reportadoEn: String,
)

data class PaginaSiniestros(val items: List<SiniestroResumen>, val siguienteCursor: String?)

data class EvidenciaReporte(val id: String, val nombreArchivo: String)

data class ArchivoEvidencia(val archivo: File, val nombreArchivo: String, val tipoContenido: String)

data class HitoReporte(val accion: String, val estadoNuevo: String?, val ocurridoEn: String)

data class SiniestroDetalle(
    val resumen: SiniestroResumen,
    val descripcion: String?,
    val causa: String,
    val fechaEvento: String,
    val evidencias: List<EvidenciaReporte>,
    val historial: List<HitoReporte>,
    val ubicacion: UbicacionReporte? = null,
)

data class EvidenciaTemporal(
    val id: String,
    val archivo: File,
    val tipo: TipoEvidencia,
    val capturadaEn: String?,
    val duracionSegundos: Int? = null,
    val evidenciaIdServidor: String? = null,
    val tipoContenido: String = when (tipo) {
        TipoEvidencia.FOTOGRAFIA -> "image/jpeg"
        TipoEvidencia.VIDEO -> "video/mp4"
        TipoEvidencia.DESCONOCIDO -> "application/octet-stream"
    },
    val nombreArchivo: String? = null,
)

data class ArchivoImportado(
    val archivo: File,
    val nombreArchivo: String,
    val tipo: TipoEvidencia,
    val tipoContenido: String,
    val duracionSegundos: Int?,
)

interface ImportadorEvidencias {
    suspend fun importar(uri: String, limites: LimitesSiniestros): Resultado<ArchivoImportado>
}

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
    data object BorradorModificado : FalloSiniestros
    data object BorradorConvertido : FalloSiniestros
    data object SiniestroNoEncontrado : FalloSiniestros
    data object CausaObligatoria : FalloSiniestros
    data object FechaEventoInvalida : FalloSiniestros
    data object EvidenciaObligatoria : FalloSiniestros
    data object EvidenciaNoCargada : FalloSiniestros
    data object PolizaNoVigente : FalloSiniestros
    data object SolicitudInvalida : FalloSiniestros
    data object IdempotenciaConflicto : FalloSiniestros
    data object TipoEvidenciaNoAdmitido : FalloSiniestros
    data object TamanoEvidenciaExcedido : FalloSiniestros
    data object DuracionVideoExcedida : FalloSiniestros
    data object DuracionVideoNoDisponible : FalloSiniestros
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
    data object EvidenciaNoDisponible : FalloSiniestros
    data object DescargaFallida : FalloSiniestros {
        override val reintentable = true
    }
    data object VisorNoDisponible : FalloSiniestros
    data object GuardadoFallido : FalloSiniestros
    data object PendienteLocalNoDisponible : FalloSiniestros
    data object UbicacionInvalida : FalloSiniestros
}

interface RepositorioSiniestros {
    suspend fun limites(): Resultado<LimitesSiniestros>
    suspend fun listar(): Resultado<List<BorradorResumen>>
    suspend fun detalle(borradorId: String): Resultado<BorradorDetalle>
    suspend fun crearBorrador(polizaId: String, descripcion: String, claveIdempotencia: String): Resultado<Borrador>
    suspend fun actualizar(borradorId: String, descripcion: String, causa: String, fechaEvento: String): Resultado<BorradorDetalle>
    suspend fun guardarDatos(borradorId: String, descripcion: String, causa: String?, fechaEvento: String?): Resultado<BorradorDetalle>
    suspend fun guardarUbicacion(borradorId: String, ubicacion: UbicacionCapturada): Resultado<BorradorDetalle>
    suspend fun enviar(borradorId: String, claveIdempotencia: String): Resultado<EnvioSiniestro>
    suspend fun historial(cursor: String? = null): Resultado<PaginaSiniestros>
    suspend fun siniestro(siniestroId: String): Resultado<SiniestroDetalle>
    suspend fun descargarEvidencia(siniestroId: String, evidenciaId: String, directorio: File): Resultado<ArchivoEvidencia>
    suspend fun eliminarEvidencia(borradorId: String, evidenciaId: String): Resultado<Unit>
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
