package com.solventa.core.network

import com.solventa.core.network.modelo.ConsentimientoDto
import com.solventa.core.network.modelo.ErrorDto
import com.solventa.core.network.modelo.SolicitudOtorgarDto
import com.solventa.core.network.modelo.TextoVigenteDto
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import retrofit2.Response
import java.io.IOException

/**
 * Cliente de las rutas de consentimiento de bff-movil (HU-M08). Traduce la respuesta por
 * `ErrorDto.codigo` (contracts/codigos-error.md) y nunca reintenta: al otorgar, el reintento lo
 * decide quien llama, con la misma `Idempotency-Key`. No registra cuerpos ni claves.
 */
class ConsentimientosCliente(
    private val api: BffMovilApi,
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    suspend fun listar(): ResultadoConsentimiento<List<ConsentimientoDto>> =
        llamar { api.listarConsentimientos() }

    suspend fun detalle(consentimientoId: String): ResultadoConsentimiento<ConsentimientoDto> =
        llamar { api.consentimiento(consentimientoId) }

    suspend fun textoVigente(proposito: String, idioma: String): ResultadoConsentimiento<TextoVigenteDto> =
        llamar { api.textoVigente(proposito, idioma) }

    /** 201 crea; 200 con `Idempotent-Replayed: true` es la repetición de la misma clave (AC4). */
    suspend fun otorgar(
        claveIdempotencia: String,
        solicitud: SolicitudOtorgarDto,
    ): ResultadoConsentimiento<ConsentimientoDto> =
        llamar { api.otorgarConsentimiento(claveIdempotencia, solicitud) }

    private suspend fun <T> llamar(peticion: suspend () -> Response<T>): ResultadoConsentimiento<T> {
        val respuesta = try {
            peticion()
        } catch (e: IOException) {
            return ResultadoConsentimiento.Fallo(ErrorConsentimiento.SinConexion)
        } catch (e: SerializationException) {
            // El cuerpo de éxito no cumple el contrato.
            return ResultadoConsentimiento.Fallo(ErrorConsentimiento.Desconocido(null))
        } catch (e: IllegalArgumentException) {
            return ResultadoConsentimiento.Fallo(ErrorConsentimiento.Desconocido(null))
        }
        if (respuesta.isSuccessful) {
            val cuerpo = respuesta.body()
                ?: return ResultadoConsentimiento.Fallo(ErrorConsentimiento.Desconocido(respuesta.code()))
            val repeticion = respuesta.code() == 200 && respuesta.headers()[IDEMPOTENT_REPLAYED] == "true"
            return ResultadoConsentimiento.Exito(cuerpo, repeticion)
        }
        return ResultadoConsentimiento.Fallo(error(respuesta.code(), leerError(respuesta)))
    }

    private fun error(estado: Int, cuerpo: ErrorDto?): ErrorConsentimiento = when (cuerpo?.codigo) {
        "NO_AUTENTICADO" -> ErrorConsentimiento.NoAutenticado
        "ROL_NO_AUTORIZADO" -> ErrorConsentimiento.RolNoAutorizado
        "IDENTIDAD_NO_VERIFICADA" -> ErrorConsentimiento.IdentidadNoVerificada
        "CLIENTE_NO_ENCONTRADO" -> ErrorConsentimiento.ClienteNoEncontrado
        "CONSENTIMIENTO_NO_ENCONTRADO" -> ErrorConsentimiento.ConsentimientoNoEncontrado
        "CONSENTIMIENTO_YA_VIGENTE" -> ErrorConsentimiento.ConsentimientoYaVigente(
            (cuerpo.detalles["consentimientoId"] as? JsonPrimitive)?.contentOrNull,
        )
        "SOLICITUD_INVALIDA" -> ErrorConsentimiento.SolicitudInvalida(
            (cuerpo.detalles["campos"] as? JsonArray).orEmpty()
                .mapNotNull { (it as? JsonPrimitive)?.takeIf { campo -> campo.isString }?.content },
        )
        "VIGENCIA_INVALIDA" -> ErrorConsentimiento.VigenciaInvalida
        "TEXTO_NO_VIGENTE" -> ErrorConsentimiento.TextoNoVigente
        "IDEMPOTENCIA_CONFLICTO" -> ErrorConsentimiento.IdempotenciaConflicto
        "SERVICIO_NO_DISPONIBLE" -> ErrorConsentimiento.ServicioNoDisponible
        // Sin cuerpo legible: el gateway pudo responder antes del BFF.
        else -> when (estado) {
            401 -> ErrorConsentimiento.NoAutenticado
            502, 503, 504 -> ErrorConsentimiento.ServicioNoDisponible
            else -> ErrorConsentimiento.Desconocido(estado)
        }
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

    private companion object {
        const val IDEMPOTENT_REPLAYED = "Idempotent-Replayed"
    }
}
