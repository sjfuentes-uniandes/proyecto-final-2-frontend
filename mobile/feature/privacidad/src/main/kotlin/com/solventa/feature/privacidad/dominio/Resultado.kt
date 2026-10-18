package com.solventa.feature.privacidad.dominio

sealed interface Resultado<out T> {
    data class Exito<T>(val valor: T) : Resultado<T>

    data class Fallo(val fallo: FalloConsentimiento) : Resultado<Nothing>
}

/**
 * Por qué no se pudo completar una operación. La UI elige el texto por tipo (es-CO y en-US); aquí
 * no hay mensajes del servidor ni datos del titular.
 */
sealed interface FalloConsentimiento {
    /**
     * El resultado en el servidor es incierto o no llegó a procesarse: al reintentar se conserva la
     * clave de idempotencia, de modo que repetir devuelve el mismo consentimiento.
     */
    val reintentable: Boolean get() = false

    data object SinConexion : FalloConsentimiento {
        override val reintentable = true
    }

    data object ServicioNoDisponible : FalloConsentimiento {
        override val reintentable = true
    }

    /** Respuesta fuera del contrato (código desconocido, cuerpo ilegible o 5xx no documentado). */
    data object RespuestaInvalida : FalloConsentimiento {
        override val reintentable = true
    }

    /** 401: hay que volver a autenticarse. */
    data object SesionVencida : FalloConsentimiento

    /** 403 ROL_NO_AUTORIZADO: el token no es del pool de clientes. */
    data object NoAutorizado : FalloConsentimiento

    data object IdentidadNoVerificada : FalloConsentimiento

    data object ClienteNoEncontrado : FalloConsentimiento

    /** No existe o es de otro cliente: no se distingue. */
    data object NoEncontrado : FalloConsentimiento

    data class YaVigente(val consentimientoId: String?) : FalloConsentimiento

    /** AC3: `campos` son las rutas de lo que falta completar, nunca sus valores. */
    data class SolicitudInvalida(val campos: List<String>) : FalloConsentimiento

    data object VigenciaInvalida : FalloConsentimiento

    /** La versión del texto cambió: hay que volver a mostrarlo antes de otorgar. */
    data object TextoNoVigente : FalloConsentimiento

    data object IdempotenciaConflicto : FalloConsentimiento

    /** ADR 0001: permiso que esta versión no puede otorgar. No se llamó al servidor. */
    data object PermisoNoDisponible : FalloConsentimiento

    /** ADR 0007: sin confirmación biométrica no se otorga ni se revoca. No se llamó al servidor. */
    data class BiometriaNoConfirmada(val motivo: ConfirmacionBiometrica) : FalloConsentimiento {
        // La clave nunca se envió: conservarla no tiene riesgo y evita una nueva al reintentar.
        override val reintentable = true
    }
}
