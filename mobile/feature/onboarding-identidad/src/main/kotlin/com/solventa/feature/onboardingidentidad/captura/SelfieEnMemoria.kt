package com.solventa.feature.onboardingidentidad.captura

import java.util.Base64

/**
 * Selfie JPEG que vive solo en memoria: nunca se escribe en galería, caché ni archivos (AC4).
 * [limpiar] sobrescribe los bytes con ceros y suelta la referencia; guarda el mismo arreglo que se
 * le entrega, así que también borra la copia del llamador. Su `toString` no revela contenido.
 */
class SelfieEnMemoria(jpeg: ByteArray) {
    private var bytes: ByteArray? = jpeg

    val estaLimpia: Boolean get() = bytes == null

    /** Base64 para el cuerpo de la solicitud; la cadena resultante es transitoria. */
    fun aBase64(): String {
        val actuales = checkNotNull(bytes) { "La selfie ya fue limpiada" }
        return Base64.getEncoder().encodeToString(actuales)
    }

    fun limpiar() {
        bytes?.fill(0)
        bytes = null
    }

    override fun toString(): String = "SelfieEnMemoria(<redactada>)"
}
