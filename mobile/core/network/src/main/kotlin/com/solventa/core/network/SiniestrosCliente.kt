package com.solventa.core.network

import com.solventa.core.network.modelo.BorradorDetalleDto
import com.solventa.core.network.modelo.BorradorDto
import com.solventa.core.network.modelo.CargaRenovadaDto
import com.solventa.core.network.modelo.EvidenciaConfirmadaDto
import com.solventa.core.network.modelo.EvidenciaDto
import com.solventa.core.network.modelo.ErrorDto
import com.solventa.core.network.modelo.LimitesSiniestrosDto
import com.solventa.core.network.modelo.ListadoBorradoresDto
import com.solventa.core.network.modelo.SolicitudBorradorDto
import com.solventa.core.network.modelo.SolicitudFotoEvidenciaDto
import com.solventa.core.network.modelo.SolicitudVideoEvidenciaDto
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.Response
import java.io.IOException

/** Cliente de bff-movil para HU-M01. Nunca reintenta ni registra cuerpos o URLs firmadas. */
class SiniestrosCliente(
    private val api: BffMovilApi,
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    suspend fun limites(): ResultadoSiniestros<LimitesSiniestrosDto> =
        llamar { api.limitesSiniestros() }

    suspend fun listar(): ResultadoSiniestros<ListadoBorradoresDto> =
        llamar { api.listarBorradores() }

    suspend fun detalle(borradorId: String): ResultadoSiniestros<BorradorDetalleDto> =
        llamar { api.borrador(borradorId) }

    suspend fun crearBorrador(
        claveIdempotencia: String,
        solicitud: SolicitudBorradorDto,
    ): ResultadoSiniestros<BorradorDto> =
        llamar { api.crearBorrador(claveIdempotencia, solicitud) }

    suspend fun agregarFoto(
        borradorId: String,
        solicitud: SolicitudFotoEvidenciaDto,
    ): ResultadoSiniestros<EvidenciaDto> =
        llamar { api.agregarFoto(borradorId, solicitud) }

    suspend fun agregarVideo(
        borradorId: String,
        solicitud: SolicitudVideoEvidenciaDto,
    ): ResultadoSiniestros<EvidenciaDto> =
        llamar { api.agregarVideo(borradorId, solicitud) }

    suspend fun confirmar(
        borradorId: String,
        evidenciaId: String,
    ): ResultadoSiniestros<EvidenciaConfirmadaDto> =
        llamar { api.confirmarEvidencia(borradorId, evidenciaId) }

    suspend fun renovar(
        borradorId: String,
        evidenciaId: String,
    ): ResultadoSiniestros<CargaRenovadaDto> =
        llamar { api.renovarCarga(borradorId, evidenciaId) }

    private suspend fun <T> llamar(peticion: suspend () -> Response<T>): ResultadoSiniestros<T> {
        val respuesta = try {
            peticion()
        } catch (e: IOException) {
            return ResultadoSiniestros.Fallo(ErrorSiniestros.SinConexion)
        } catch (e: SerializationException) {
            return ResultadoSiniestros.Fallo(ErrorSiniestros.Desconocido(null))
        } catch (e: IllegalArgumentException) {
            return ResultadoSiniestros.Fallo(ErrorSiniestros.Desconocido(null))
        }
        if (respuesta.isSuccessful) {
            return respuesta.body()?.let { ResultadoSiniestros.Exito(it) }
                ?: ResultadoSiniestros.Fallo(ErrorSiniestros.Desconocido(respuesta.code()))
        }
        return ResultadoSiniestros.Fallo(mapearError(respuesta.code(), leerError(respuesta)))
    }

    private fun leerError(respuesta: Response<*>): ErrorDto? {
        val cuerpo = try {
            respuesta.errorBody()?.string()
        } catch (e: IOException) {
            null
        } ?: return null
        return try {
            json.decodeFromString(ErrorDto.serializer(), cuerpo)
        } catch (e: SerializationException) {
            null
        } catch (e: IllegalArgumentException) {
            null
        }
    }

    private fun mapearError(estado: Int, dto: ErrorDto?): ErrorSiniestros = when (dto?.codigo) {
        "NO_AUTENTICADO" -> ErrorSiniestros.NoAutenticado
        "ROL_NO_AUTORIZADO" -> ErrorSiniestros.RolNoAutorizado
        "POLIZA_NO_AUTORIZADA" -> ErrorSiniestros.PolizaNoAutorizada
        "CLIENTE_NO_ENCONTRADO" -> ErrorSiniestros.ClienteNoEncontrado
        "POLIZA_NO_ENCONTRADA" -> ErrorSiniestros.PolizaNoEncontrada
        "BORRADOR_NO_ENCONTRADO" -> ErrorSiniestros.BorradorNoEncontrado
        "POLIZA_NO_VIGENTE" -> ErrorSiniestros.PolizaNoVigente
        "SOLICITUD_INVALIDA" -> ErrorSiniestros.SolicitudInvalida
        "IDEMPOTENCIA_CONFLICTO" -> ErrorSiniestros.IdempotenciaConflicto
        "TIPO_EVIDENCIA_NO_ADMITIDO" -> ErrorSiniestros.TipoEvidenciaNoAdmitido
        "TAMANO_EVIDENCIA_EXCEDIDO" -> ErrorSiniestros.TamanoEvidenciaExcedido
        "DURACION_VIDEO_EXCEDIDA" -> ErrorSiniestros.DuracionVideoExcedida
        "LIMITE_EVIDENCIAS_ALCANZADO" -> ErrorSiniestros.LimiteEvidenciasAlcanzado
        "EVIDENCIA_NO_CARGADA" -> ErrorSiniestros.EvidenciaNoCargada
        "EVIDENCIA_YA_CONFIRMADA" -> ErrorSiniestros.EvidenciaYaConfirmada
        "INTEGRIDAD_EVIDENCIA_INVALIDA" -> ErrorSiniestros.IntegridadEvidenciaInvalida
        "SERVICIO_NO_DISPONIBLE" -> ErrorSiniestros.ServicioNoDisponible
        else -> when (estado) {
            401 -> ErrorSiniestros.NoAutenticado
            403 -> ErrorSiniestros.RolNoAutorizado
            502, 503, 504 -> ErrorSiniestros.ServicioNoDisponible
            else -> ErrorSiniestros.Desconocido(estado)
        }
    }
}
