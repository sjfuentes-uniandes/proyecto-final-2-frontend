package com.solventa.core.network

import com.solventa.core.network.modelo.PolizaDetalleDto
import com.solventa.core.network.modelo.PolizaResumenDto

/**
 * Resultado tipado de `GET /v1/polizas`, traducido desde el HTTP + `ErrorDto.codigo`. Ningún caso de
 * fallo lleva datos de pólizas.
 */
sealed class ResultadoPolizas {
    data class Exito(val polizas: List<PolizaResumenDto>) : ResultadoPolizas()

    /** 401 NO_AUTENTICADO o 403 ROL_NO_AUTORIZADO: hay que cerrar la sesión. */
    data class NoAutenticado(val mensaje: String) : ResultadoPolizas()

    /** 403 POLIZA_NO_AUTORIZADA. */
    data object PolizaNoAutorizada : ResultadoPolizas()

    /** 404 CLIENTE_NO_ENCONTRADO: se trata como sesión inválida. */
    data class ClienteNoEncontrado(val mensaje: String) : ResultadoPolizas()

    /** 404 POLIZA_NO_ENCONTRADA. */
    data class PolizaNoEncontrada(val mensaje: String) : ResultadoPolizas()

    /** 422 SOLICITUD_INVALIDA. */
    data class SolicitudInvalida(val mensaje: String) : ResultadoPolizas()

    /** 503 SERVICIO_NO_DISPONIBLE. */
    data class ServicioNoDisponible(val mensaje: String) : ResultadoPolizas()

    /** Sin conexión o error de transporte. */
    data class SinConexion(val mensaje: String) : ResultadoPolizas()

    /** Respuesta fuera del contrato (código desconocido, cuerpo vacío o ilegible). */
    data class ErrorDesconocido(val mensaje: String) : ResultadoPolizas()
}

/** Resultado tipado de `GET /v1/polizas/{poliza_id}`; mismos casos que [ResultadoPolizas]. */
sealed class ResultadoPoliza {
    data class Exito(val poliza: PolizaDetalleDto) : ResultadoPoliza()

    data class NoAutenticado(val mensaje: String) : ResultadoPoliza()

    data object PolizaNoAutorizada : ResultadoPoliza()

    data class ClienteNoEncontrado(val mensaje: String) : ResultadoPoliza()

    data class PolizaNoEncontrada(val mensaje: String) : ResultadoPoliza()

    data class SolicitudInvalida(val mensaje: String) : ResultadoPoliza()

    data class ServicioNoDisponible(val mensaje: String) : ResultadoPoliza()

    data class SinConexion(val mensaje: String) : ResultadoPoliza()

    data class ErrorDesconocido(val mensaje: String) : ResultadoPoliza()
}
