package com.solventa.core.network

/**
 * Resultado tipado de `POST /v1/identidad/verificaciones`. Se traduce por `ErrorDto.codigo` (nunca
 * por `mensaje`); por eso no se expone el mensaje del servidor: la UI usa sus propios textos.
 * `correlationId` se conserva para soporte.
 */
sealed class ResultadoVerificacion {
    /** Solo los errores de transporte o de disponibilidad permiten reintentar tal cual (AC3). */
    open val esRecuperable: Boolean get() = false

    /** 200 APROBADO / VERIFICADO (AC1). */
    data class Aprobada(val clienteId: String, val verificadoEn: String?) : ResultadoVerificacion()

    /** 200 CAPTURA_INVALIDA / PENDIENTE: hay que repetir la captura; no es un rechazo (AC2). */
    data class CapturaInvalida(val motivo: String?) : ResultadoVerificacion()

    /** 200 RECHAZADO / RECHAZADO: el proveedor no pudo verificar la identidad. */
    data class Rechazada(val motivo: String?) : ResultadoVerificacion()

    /** 503 SERVICIO_NO_DISPONIBLE: la verificación no terminó; reintentar es seguro (AC3). */
    data class ServicioNoDisponible(val correlationId: String?) : ResultadoVerificacion() {
        override val esRecuperable: Boolean get() = true
    }

    /** Sin conexión o error de transporte: la solicitud no llegó o se cortó (AC3). */
    data object SinConexion : ResultadoVerificacion() {
        override val esRecuperable: Boolean get() = true
    }

    /** 401 NO_AUTENTICADO: pedir autenticación completa. */
    data class NoAutenticado(val correlationId: String?) : ResultadoVerificacion()

    /** 403 ROL_NO_AUTORIZADO: el token no es del pool de clientes; no reintentar. */
    data class RolNoAutorizado(val correlationId: String?) : ResultadoVerificacion()

    /** 422 SOLICITUD_INVALIDA: selfie vacía o cuerpo mal formado. */
    data class SolicitudInvalida(val correlationId: String?) : ResultadoVerificacion()

    /** Respuesta fuera del contrato (código desconocido, cuerpo ilegible o estado incoherente). */
    data class ErrorDesconocido(val correlationId: String?) : ResultadoVerificacion()
}
