package com.solventa.core.network

import com.solventa.core.network.modelo.ErrorDto
import kotlinx.serialization.json.Json
import retrofit2.Response
import java.io.IOException

/**
 * Cliente de `GET /v1/sesion`: traduce la respuesta HTTP + `ErrorDto.codigo` (nunca `mensaje`)
 * a un [ResultadoSesion]. El mapeo de códigos sigue acuerdos/codigos-error.md.
 */
class BffMovilCliente(
    private val api: BffMovilApi,
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    suspend fun consultarSesion(): ResultadoSesion {
        val respuesta = try {
            api.sesion()
        } catch (e: IOException) {
            return ResultadoSesion.SinConexion(e.message ?: "Sin conexión")
        }
        return interpretar(respuesta)
    }

    private fun interpretar(respuesta: Response<com.solventa.core.network.modelo.SesionDto>): ResultadoSesion {
        if (respuesta.isSuccessful) {
            val cuerpo = respuesta.body()
            return if (cuerpo != null) {
                ResultadoSesion.Exito(cuerpo)
            } else {
                ResultadoSesion.ErrorDesconocido("Respuesta vacía del servidor")
            }
        }

        val error = leerError(respuesta)
        val mensaje = error?.mensaje ?: "No fue posible completar la operación. Inténtalo de nuevo."
        return when (respuesta.code()) {
            401 -> ResultadoSesion.NoAutenticado(mensaje)
            403 -> ResultadoSesion.RolNoAutorizado(mensaje)
            404 -> ResultadoSesion.ClienteNoEncontrado(mensaje)
            422 -> ResultadoSesion.SolicitudInvalida(mensaje)
            503 -> ResultadoSesion.ServicioNoDisponible(mensaje)
            else -> ResultadoSesion.ErrorDesconocido(mensaje)
        }
    }

    private fun leerError(respuesta: Response<*>): ErrorDto? = leerErrorDto(respuesta, json)
}
