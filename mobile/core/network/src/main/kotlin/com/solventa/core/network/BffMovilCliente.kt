package com.solventa.core.network

import com.solventa.core.network.modelo.ErrorDto
import kotlinx.serialization.SerializationException
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

    suspend fun consultarPolizas(): ResultadoPolizas = when (val r = ejecutar(esLista = true) { api.polizas() }) {
        is Llamada.Cuerpo -> ResultadoPolizas.Exito(r.valor)
        is Llamada.SinConexion -> ResultadoPolizas.SinConexion(r.mensaje)
        is Llamada.Desconocido -> ResultadoPolizas.ErrorDesconocido(r.mensaje)
        is Llamada.Fallo -> when (r.clase) {
            ClaseError.NO_AUTENTICADO -> ResultadoPolizas.NoAutenticado(r.mensaje)
            ClaseError.POLIZA_NO_AUTORIZADA -> ResultadoPolizas.PolizaNoAutorizada
            ClaseError.CLIENTE_NO_ENCONTRADO -> ResultadoPolizas.ClienteNoEncontrado(r.mensaje)
            ClaseError.POLIZA_NO_ENCONTRADA -> ResultadoPolizas.PolizaNoEncontrada(r.mensaje)
            ClaseError.SOLICITUD_INVALIDA -> ResultadoPolizas.SolicitudInvalida(r.mensaje)
            ClaseError.SERVICIO_NO_DISPONIBLE -> ResultadoPolizas.ServicioNoDisponible(r.mensaje)
            ClaseError.DESCONOCIDO -> ResultadoPolizas.ErrorDesconocido(r.mensaje)
        }
    }

    suspend fun consultarPoliza(polizaId: String): ResultadoPoliza = when (val r = ejecutar { api.poliza(polizaId) }) {
        is Llamada.Cuerpo -> ResultadoPoliza.Exito(r.valor)
        is Llamada.SinConexion -> ResultadoPoliza.SinConexion(r.mensaje)
        is Llamada.Desconocido -> ResultadoPoliza.ErrorDesconocido(r.mensaje)
        is Llamada.Fallo -> when (r.clase) {
            ClaseError.NO_AUTENTICADO -> ResultadoPoliza.NoAutenticado(r.mensaje)
            ClaseError.POLIZA_NO_AUTORIZADA -> ResultadoPoliza.PolizaNoAutorizada
            ClaseError.CLIENTE_NO_ENCONTRADO -> ResultadoPoliza.ClienteNoEncontrado(r.mensaje)
            ClaseError.POLIZA_NO_ENCONTRADA -> ResultadoPoliza.PolizaNoEncontrada(r.mensaje)
            ClaseError.SOLICITUD_INVALIDA -> ResultadoPoliza.SolicitudInvalida(r.mensaje)
            ClaseError.SERVICIO_NO_DISPONIBLE -> ResultadoPoliza.ServicioNoDisponible(r.mensaje)
            ClaseError.DESCONOCIDO -> ResultadoPoliza.ErrorDesconocido(r.mensaje)
        }
    }

    private sealed interface Llamada<out T> {
        data class Cuerpo<T>(val valor: T) : Llamada<T>
        data class Fallo(val clase: ClaseError, val mensaje: String) : Llamada<Nothing>
        data class SinConexion(val mensaje: String) : Llamada<Nothing>
        data class Desconocido(val mensaje: String) : Llamada<Nothing>
    }

    private enum class ClaseError {
        NO_AUTENTICADO,
        POLIZA_NO_AUTORIZADA,
        CLIENTE_NO_ENCONTRADO,
        POLIZA_NO_ENCONTRADA,
        SOLICITUD_INVALIDA,
        SERVICIO_NO_DISPONIBLE,
        DESCONOCIDO,
    }

    /** Un cuerpo de éxito ilegible o fuera del contrato es [Llamada.Desconocido]: nunca un crash. */
    private suspend fun <T> ejecutar(esLista: Boolean = false, peticion: suspend () -> Response<T>): Llamada<T> {
        return try {
            val respuesta = peticion()
            if (respuesta.isSuccessful) {
                val cuerpo = respuesta.body()
                if (cuerpo != null) Llamada.Cuerpo(cuerpo) else Llamada.Desconocido("Respuesta vacía del servidor")
            } else {
                val error = leerError(respuesta)
                Llamada.Fallo(clasificar(respuesta.code(), error?.codigo, esLista), error?.mensaje ?: MENSAJE_GENERICO)
            }
        } catch (e: IOException) {
            Llamada.SinConexion(e.message ?: "Sin conexión")
        } catch (e: SerializationException) {
            Llamada.Desconocido("Respuesta fuera del contrato")
        }
    }

    /** Distingue por `codigo`; si el cuerpo no se pudo leer, decide solo el estado HTTP. */
    private fun clasificar(estado: Int, codigo: String?, esLista: Boolean): ClaseError = when (codigo) {
        "NO_AUTENTICADO", "ROL_NO_AUTORIZADO" -> ClaseError.NO_AUTENTICADO
        "POLIZA_NO_AUTORIZADA" -> ClaseError.POLIZA_NO_AUTORIZADA
        "CLIENTE_NO_ENCONTRADO" -> ClaseError.CLIENTE_NO_ENCONTRADO
        "POLIZA_NO_ENCONTRADA" -> ClaseError.POLIZA_NO_ENCONTRADA
        "SOLICITUD_INVALIDA" -> ClaseError.SOLICITUD_INVALIDA
        "SERVICIO_NO_DISPONIBLE" -> ClaseError.SERVICIO_NO_DISPONIBLE
        else -> when (estado) {
            401 -> ClaseError.NO_AUTENTICADO
            // La lista solo responde 403 ROL_NO_AUTORIZADO; el detalle, POLIZA_NO_AUTORIZADA.
            403 -> if (esLista) ClaseError.NO_AUTENTICADO else ClaseError.POLIZA_NO_AUTORIZADA
            422 -> ClaseError.SOLICITUD_INVALIDA
            503 -> ClaseError.SERVICIO_NO_DISPONIBLE
            else -> ClaseError.DESCONOCIDO
        }
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

    private companion object {
        const val MENSAJE_GENERICO = "No fue posible completar la operación. Inténtalo de nuevo."
    }
}
