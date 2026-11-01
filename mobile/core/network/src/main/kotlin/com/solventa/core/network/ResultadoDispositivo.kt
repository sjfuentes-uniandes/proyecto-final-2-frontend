package com.solventa.core.network

/** Resultado tipado de `POST /v1/dispositivos`. Ningún caso lleva el token push. */
sealed class ResultadoDispositivo {
    data class Exito(val dispositivoId: String) : ResultadoDispositivo() {
        override fun toString(): String = "Exito(dispositivoId=***)"
    }

    /** 401 NO_AUTENTICADO, 403 ROL_NO_AUTORIZADO o 404 CLIENTE_NO_ENCONTRADO. */
    data class SesionInvalida(val mensaje: String) : ResultadoDispositivo()

    /** 400 o 422 SOLICITUD_INVALIDA. */
    data class SolicitudInvalida(val mensaje: String) : ResultadoDispositivo()

    /** 503 SERVICIO_NO_DISPONIBLE. */
    data class ServicioNoDisponible(val mensaje: String) : ResultadoDispositivo()

    data class SinConexion(val mensaje: String) : ResultadoDispositivo()

    /** Respuesta fuera del contrato (código desconocido, cuerpo vacío o ilegible). */
    data class ErrorDesconocido(val mensaje: String) : ResultadoDispositivo()
}

/** Resultado de `DELETE /v1/dispositivos/{id}`: cualquier fallo se tolera (la baja es best-effort). */
sealed class ResultadoBajaDispositivo {
    /** 204. */
    data object Exito : ResultadoBajaDispositivo()

    /** 401, 403, 404, 422, 503, sin conexión o respuesta inesperada. */
    data object Tolerado : ResultadoBajaDispositivo()
}
