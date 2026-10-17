package com.solventa.core.network

/**
 * Resultado tipado de las rutas `/v1/consentimientos` (HU-M08), traducido por `ErrorDto.codigo`
 * (contracts/codigos-error.md), nunca por `mensaje`: la app muestra su propio texto por código.
 */
sealed class ResultadoConsentimiento<out T> {
    /** `repeticion`: 200 + `Idempotent-Replayed: true` (misma clave y mismo cuerpo). */
    data class Exito<T>(val valor: T, val repeticion: Boolean = false) : ResultadoConsentimiento<T>()

    data class Fallo(val error: ErrorConsentimiento) : ResultadoConsentimiento<Nothing>()
}

/** Errores del contrato de consentimientos. No llevan textos del servidor ni datos personales. */
sealed class ErrorConsentimiento {
    /** 401 NO_AUTENTICADO: la app debe pedir autenticación completa. */
    data object NoAutenticado : ErrorConsentimiento()

    /** 403 ROL_NO_AUTORIZADO: el token no es del pool de clientes. */
    data object RolNoAutorizado : ErrorConsentimiento()

    /** 403 IDENTIDAD_NO_VERIFICADA: otorgar exige la identidad VERIFICADO. */
    data object IdentidadNoVerificada : ErrorConsentimiento()

    /** 404 CLIENTE_NO_ENCONTRADO: el titular aún no inició su verificación. */
    data object ClienteNoEncontrado : ErrorConsentimiento()

    /** 404 CONSENTIMIENTO_NO_ENCONTRADO: no existe o es de otro cliente (no se distingue). */
    data object ConsentimientoNoEncontrado : ErrorConsentimiento()

    /** 409 CONSENTIMIENTO_YA_VIGENTE, con el `consentimientoId` del vigente si vino en `detalles`. */
    data class ConsentimientoYaVigente(val consentimientoId: String?) : ErrorConsentimiento()

    /** 422 SOLICITUD_INVALIDA: `campos` son rutas de campos, nunca valores (AC3). */
    data class SolicitudInvalida(val campos: List<String>) : ErrorConsentimiento()

    /** 422 VIGENCIA_INVALIDA: la vigencia no es una de las permitidas (ADR 0005). */
    data object VigenciaInvalida : ErrorConsentimiento()

    /** 422 TEXTO_NO_VIGENTE: la versión del texto ya no es la vigente; hay que volver a leerlo. */
    data object TextoNoVigente : ErrorConsentimiento()

    /** 422 IDEMPOTENCIA_CONFLICTO: la misma clave se usó con otro cuerpo. */
    data object IdempotenciaConflicto : ErrorConsentimiento()

    /** 503 SERVICIO_NO_DISPONIBLE: se puede reintentar (con la misma clave al otorgar). */
    data object ServicioNoDisponible : ErrorConsentimiento()

    /** No hubo respuesta (sin red o timeout): al otorgar, el resultado es incierto; se reintenta. */
    data object SinConexion : ErrorConsentimiento()

    /** Respuesta fuera del contrato: código desconocido o cuerpo que no se puede leer. */
    data class Desconocido(val estadoHttp: Int?) : ErrorConsentimiento()
}
