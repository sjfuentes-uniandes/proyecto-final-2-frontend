package com.solventa.core.network

import com.solventa.core.network.modelo.SesionDto

/**
 * Resultado tipado de `GET /v1/sesion`, ya traducido desde el HTTP + `ErrorDto.codigo`
 * (acuerdos/codigos-error.md). El `mensaje` es el de `ErrorDto`, listo para mostrar al usuario;
 * nunca se expone un stack trace.
 */
sealed class ResultadoSesion {
    data class Exito(val sesion: SesionDto) : ResultadoSesion()

    /** 401 NO_AUTENTICADO: falta el token, venció, firma inválida o no corresponde al titular. */
    data class NoAutenticado(val mensaje: String) : ResultadoSesion()

    /** 403 ROL_NO_AUTORIZADO: el token no es del pool de clientes. */
    data class RolNoAutorizado(val mensaje: String) : ResultadoSesion()

    /** 404 CLIENTE_NO_ENCONTRADO. */
    data class ClienteNoEncontrado(val mensaje: String) : ResultadoSesion()

    /** 422 SOLICITUD_INVALIDA: un encabezado no cumple su formato. */
    data class SolicitudInvalida(val mensaje: String) : ResultadoSesion()

    /** 503 SERVICIO_NO_DISPONIBLE: no se pudo verificar la identidad del cliente. */
    data class ServicioNoDisponible(val mensaje: String) : ResultadoSesion()

    /** Sin conexión o error de transporte (no llegó a responder el servidor). */
    data class SinConexion(val mensaje: String) : ResultadoSesion()

    /** Cualquier otra respuesta no documentada en el contrato. */
    data class ErrorDesconocido(val mensaje: String) : ResultadoSesion()
}
