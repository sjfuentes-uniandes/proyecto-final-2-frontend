package com.solventa.core.network

import com.solventa.core.network.modelo.PruebaDeVidaDto
import com.solventa.core.network.modelo.VerificacionIdentidadDto
import com.solventa.core.network.modelo.VerificacionIdentidadSolicitud
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.Response
import java.io.IOException

/**
 * Cliente de `POST /v1/identidad/verificaciones`: envía la selfie y la prueba de vida y traduce la
 * respuesta a un [ResultadoVerificacion]. Reenviar la misma verificación es seguro: el backend no
 * crea otro cliente (AC3).
 */
class VerificacionIdentidadCliente(
    private val api: BffMovilApi,
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    suspend fun verificar(selfieBase64: String, pruebaDeVidaCompletada: Boolean): ResultadoVerificacion {
        val solicitud = VerificacionIdentidadSolicitud(selfieBase64, PruebaDeVidaDto(pruebaDeVidaCompletada))
        val respuesta = try {
            api.verificarIdentidad(solicitud)
        } catch (e: IOException) {
            return ResultadoVerificacion.SinConexion
        } catch (e: SerializationException) {
            return ResultadoVerificacion.ErrorDesconocido(correlationId = null)
        }
        return if (respuesta.isSuccessful) interpretarExito(respuesta) else interpretarError(respuesta)
    }

    private fun interpretarExito(respuesta: Response<VerificacionIdentidadDto>): ResultadoVerificacion {
        val correlationId = respuesta.headers()[ENCABEZADO_CORRELACION]
        val cuerpo = respuesta.body() ?: return ResultadoVerificacion.ErrorDesconocido(correlationId)
        return when (cuerpo.resultado) {
            // Solo se da por verificada la combinación completa; un estado incoherente nunca aprueba.
            RESULTADO_APROBADO ->
                if (cuerpo.estado == ESTADO_VERIFICADO) {
                    ResultadoVerificacion.Aprobada(cuerpo.clienteId, cuerpo.verificadoEn)
                } else {
                    ResultadoVerificacion.ErrorDesconocido(correlationId)
                }
            RESULTADO_CAPTURA_INVALIDA -> ResultadoVerificacion.CapturaInvalida(cuerpo.motivo)
            RESULTADO_RECHAZADO -> ResultadoVerificacion.Rechazada(cuerpo.motivo)
            else -> ResultadoVerificacion.ErrorDesconocido(correlationId)
        }
    }

    private fun interpretarError(respuesta: Response<*>): ResultadoVerificacion {
        val error = leerErrorDto(respuesta, json)
        val correlationId = error?.correlationId ?: respuesta.headers()[ENCABEZADO_CORRELACION]
        // Se traduce por `codigo`; el estado HTTP solo respalda respuestas sin cuerpo del contrato
        // (por ejemplo, un 503 de la pasarela).
        val codigo = error?.codigo ?: when (respuesta.code()) {
            401 -> CODIGO_NO_AUTENTICADO
            403 -> CODIGO_ROL_NO_AUTORIZADO
            422 -> CODIGO_SOLICITUD_INVALIDA
            503 -> CODIGO_SERVICIO_NO_DISPONIBLE
            else -> null
        }
        return when (codigo) {
            CODIGO_NO_AUTENTICADO -> ResultadoVerificacion.NoAutenticado(correlationId)
            CODIGO_ROL_NO_AUTORIZADO -> ResultadoVerificacion.RolNoAutorizado(correlationId)
            CODIGO_SOLICITUD_INVALIDA -> ResultadoVerificacion.SolicitudInvalida(correlationId)
            CODIGO_SERVICIO_NO_DISPONIBLE -> ResultadoVerificacion.ServicioNoDisponible(correlationId)
            else -> ResultadoVerificacion.ErrorDesconocido(correlationId)
        }
    }

    private companion object {
        const val ENCABEZADO_CORRELACION = "X-Correlation-Id"
        const val ESTADO_VERIFICADO = "VERIFICADO"
        const val RESULTADO_APROBADO = "APROBADO"
        const val RESULTADO_CAPTURA_INVALIDA = "CAPTURA_INVALIDA"
        const val RESULTADO_RECHAZADO = "RECHAZADO"
        const val CODIGO_NO_AUTENTICADO = "NO_AUTENTICADO"
        const val CODIGO_ROL_NO_AUTORIZADO = "ROL_NO_AUTORIZADO"
        const val CODIGO_SOLICITUD_INVALIDA = "SOLICITUD_INVALIDA"
        const val CODIGO_SERVICIO_NO_DISPONIBLE = "SERVICIO_NO_DISPONIBLE"
    }
}
