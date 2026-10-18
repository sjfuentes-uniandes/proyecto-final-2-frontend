package com.solventa.core.network

/** Resultado de `POST /v1/registro/verificaciones`. Se traduce por `codigo`, nunca por `mensaje`. */
sealed class ResultadoVerificacionRegistro {
    open val esRecuperable: Boolean get() = false

    /** 200 VERIFICADO: habilita el registro. `tokenRegistro` solo debe vivir en memoria. */
    data class Verificada(val clienteId: String, val tokenRegistro: String, val expiraEn: String?) :
        ResultadoVerificacionRegistro() {
        override fun toString(): String = "Verificada(clienteId=$clienteId, tokenRegistro=<redactado>, expiraEn=$expiraEn)"
    }

    /** 200 PENDIENTE / CAPTURA_INVALIDA: repetir la captura con el mismo registroId (AC2). */
    data class CapturaInvalida(val motivo: String?) : ResultadoVerificacionRegistro()

    /** 200 RECHAZADO. */
    data class Rechazada(val motivo: String?) : ResultadoVerificacionRegistro()

    /** 503: la verificación no terminó; reintentar con el mismo registroId (AC3). */
    data class ServicioNoDisponible(val correlationId: String?) : ResultadoVerificacionRegistro() {
        override val esRecuperable: Boolean get() = true
    }

    data object SinConexion : ResultadoVerificacionRegistro() {
        override val esRecuperable: Boolean get() = true
    }

    /** 429: demasiados intentos; esperar y reintentar. */
    data class DemasiadosIntentos(val correlationId: String?) : ResultadoVerificacionRegistro() {
        override val esRecuperable: Boolean get() = true
    }

    /** 409 REGISTRO_CORREO_DISTINTO: la verificación quedó ligada a otro correo; usar un registroId nuevo. */
    data class CorreoDistinto(val correlationId: String?) : ResultadoVerificacionRegistro()

    /** 409 REGISTRO_YA_VINCULADO: la cuenta ya existe; mandar a iniciar sesión. */
    data class YaVinculado(val correlationId: String?) : ResultadoVerificacionRegistro()

    /** 422 SOLICITUD_INVALIDA. */
    data class SolicitudInvalida(val correlationId: String?, val campos: List<String> = emptyList()) :
        ResultadoVerificacionRegistro()

    data class ErrorDesconocido(val correlationId: String?) : ResultadoVerificacionRegistro()
}

/** Motivos de `403 TOKEN_REGISTRO_INVALIDO` (`detalles.motivo`). */
enum class MotivoTokenRegistro {
    VENCIDO, FIRMA, FORMATO, REGISTRO, CORREO, CLIENTE, NO_VERIFICADO, OTRO;

    companion object {
        fun desde(motivo: String?): MotivoTokenRegistro = entries.firstOrNull { it.name == motivo } ?: OTRO
    }
}

/** Resultado de `POST /v1/registro/vinculacion` (idempotente: repetirlo es inofensivo). */
sealed class ResultadoVinculacion {
    open val esRecuperable: Boolean get() = false

    data class Vinculada(val clienteId: String) : ResultadoVinculacion()

    data class NoAutenticado(val correlationId: String?) : ResultadoVinculacion()

    /** 403 TOKEN_REGISTRO_INVALIDO: volver a verificar. */
    data class TokenInvalido(val motivo: MotivoTokenRegistro, val correlationId: String?) : ResultadoVinculacion()

    /** 409 REGISTRO_YA_VINCULADO: otra cuenta ya tomó ese registro. */
    data class YaVinculado(val correlationId: String?) : ResultadoVinculacion()

    data class ServicioNoDisponible(val correlationId: String?) : ResultadoVinculacion() {
        override val esRecuperable: Boolean get() = true
    }

    data object SinConexion : ResultadoVinculacion() {
        override val esRecuperable: Boolean get() = true
    }

    data class ErrorDesconocido(val correlationId: String?) : ResultadoVinculacion()
}
