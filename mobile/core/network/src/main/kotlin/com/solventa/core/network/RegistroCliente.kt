package com.solventa.core.network

import com.solventa.core.network.modelo.ErrorDto
import com.solventa.core.network.modelo.PruebaDeVidaDto
import com.solventa.core.network.modelo.RegistroVerificacionDto
import com.solventa.core.network.modelo.RegistroVerificacionSolicitud
import com.solventa.core.network.modelo.ValidacionRegistroSolicitud
import com.solventa.core.network.modelo.VinculacionSolicitud
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import retrofit2.Response
import java.io.IOException

/**
 * Cliente de los endpoints de registro de bff-movil: verificar la identidad antes de que exista
 * la cuenta, vincular la cuenta tras el primer ingreso y (solo en local) simular el pre sign-up.
 */
class RegistroCliente(
    private val api: BffMovilApi,
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    suspend fun verificar(
        registroId: String,
        correo: String,
        selfieBase64: String,
        pruebaDeVidaCompletada: Boolean,
    ): ResultadoVerificacionRegistro {
        val solicitud = RegistroVerificacionSolicitud(
            registroId, correo, selfieBase64, PruebaDeVidaDto(pruebaDeVidaCompletada),
        )
        val respuesta = try {
            api.verificarRegistro(solicitud)
        } catch (e: IOException) {
            return ResultadoVerificacionRegistro.SinConexion
        } catch (e: SerializationException) {
            return ResultadoVerificacionRegistro.ErrorDesconocido(null)
        }
        return if (respuesta.isSuccessful) interpretarVerificacion(respuesta) else interpretarErrorVerificacion(respuesta)
    }

    suspend fun vincular(registroId: String, tokenRegistro: String): ResultadoVinculacion {
        val respuesta = try {
            api.vincularRegistro(VinculacionSolicitud(registroId, tokenRegistro))
        } catch (e: IOException) {
            return ResultadoVinculacion.SinConexion
        } catch (e: SerializationException) {
            return ResultadoVinculacion.ErrorDesconocido(null)
        }
        if (respuesta.isSuccessful) {
            val cuerpo = respuesta.body()
                ?: return ResultadoVinculacion.ErrorDesconocido(respuesta.headers()[ENCABEZADO_CORRELACION])
            return ResultadoVinculacion.Vinculada(cuerpo.clienteId)
        }
        val error = leerErrorDto(respuesta, json)
        val correlationId = error?.correlationId ?: respuesta.headers()[ENCABEZADO_CORRELACION]
        return when (codigoDe(error, respuesta.code())) {
            "NO_AUTENTICADO" -> ResultadoVinculacion.NoAutenticado(correlationId)
            "TOKEN_REGISTRO_INVALIDO" ->
                ResultadoVinculacion.TokenInvalido(MotivoTokenRegistro.desde(motivoDe(error)), correlationId)
            "REGISTRO_YA_VINCULADO" -> ResultadoVinculacion.YaVinculado(correlationId)
            "SERVICIO_NO_DISPONIBLE" -> ResultadoVinculacion.ServicioNoDisponible(correlationId)
            else -> ResultadoVinculacion.ErrorDesconocido(correlationId)
        }
    }

    /** Solo backend local: simula la validación que en AWS hace el Lambda pre sign-up de Cognito. */
    suspend fun validarLocal(tokenRegistro: String, correo: String): Boolean {
        val respuesta = try {
            api.validarRegistroLocal(ValidacionRegistroSolicitud(tokenRegistro, correo))
        } catch (e: IOException) {
            return false
        } catch (e: SerializationException) {
            return false
        }
        return respuesta.isSuccessful && respuesta.body()?.valido == true
    }

    private fun interpretarVerificacion(respuesta: Response<RegistroVerificacionDto>): ResultadoVerificacionRegistro {
        val correlationId = respuesta.headers()[ENCABEZADO_CORRELACION]
        val cuerpo = respuesta.body() ?: return ResultadoVerificacionRegistro.ErrorDesconocido(correlationId)
        return when (cuerpo.resultado) {
            // Sin tokenRegistro o con un estado incoherente nunca se habilita el registro.
            "APROBADO" ->
                if (cuerpo.estado == "VERIFICADO" && !cuerpo.tokenRegistro.isNullOrBlank()) {
                    ResultadoVerificacionRegistro.Verificada(cuerpo.clienteId, cuerpo.tokenRegistro, cuerpo.expiraEn)
                } else {
                    ResultadoVerificacionRegistro.ErrorDesconocido(correlationId)
                }
            "CAPTURA_INVALIDA" -> ResultadoVerificacionRegistro.CapturaInvalida(cuerpo.motivo)
            "RECHAZADO" -> ResultadoVerificacionRegistro.Rechazada(cuerpo.motivo)
            else -> ResultadoVerificacionRegistro.ErrorDesconocido(correlationId)
        }
    }

    private fun interpretarErrorVerificacion(respuesta: Response<*>): ResultadoVerificacionRegistro {
        val error = leerErrorDto(respuesta, json)
        val correlationId = error?.correlationId ?: respuesta.headers()[ENCABEZADO_CORRELACION]
        return when (codigoDe(error, respuesta.code())) {
            "SERVICIO_NO_DISPONIBLE" -> ResultadoVerificacionRegistro.ServicioNoDisponible(correlationId)
            "REGISTRO_CORREO_DISTINTO" -> ResultadoVerificacionRegistro.CorreoDistinto(correlationId)
            "REGISTRO_YA_VINCULADO" -> ResultadoVerificacionRegistro.YaVinculado(correlationId)
            "SOLICITUD_INVALIDA" -> ResultadoVerificacionRegistro.SolicitudInvalida(correlationId, camposDe(error))
            "DEMASIADOS_INTENTOS" -> ResultadoVerificacionRegistro.DemasiadosIntentos(correlationId)
            else -> ResultadoVerificacionRegistro.ErrorDesconocido(correlationId)
        }
    }

    // El estado HTTP solo respalda respuestas sin cuerpo del contrato (por ejemplo, 429/503 de la pasarela).
    private fun codigoDe(error: ErrorDto?, estado: Int): String? = error?.codigo ?: when (estado) {
        401 -> "NO_AUTENTICADO"
        422 -> "SOLICITUD_INVALIDA"
        429 -> "DEMASIADOS_INTENTOS"
        503 -> "SERVICIO_NO_DISPONIBLE"
        else -> null
    }

    private fun motivoDe(error: ErrorDto?): String? = (error?.detalles?.get("motivo") as? JsonPrimitive)?.contentOrNull

    private fun camposDe(error: ErrorDto?): List<String> =
        (error?.detalles?.get("campos") as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull }.orEmpty()

    private companion object {
        const val ENCABEZADO_CORRELACION = "X-Correlation-Id"
    }
}
