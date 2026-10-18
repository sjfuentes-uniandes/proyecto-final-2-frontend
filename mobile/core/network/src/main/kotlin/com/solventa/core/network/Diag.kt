package com.solventa.core.network

import android.util.Log

/**
 * Logs de diagnóstico para seguir un recorrido en el simulador con `adb logcat -s Solventa`.
 * Reglas: solo hechos técnicos (ruta, estado, código, correlationId, tipo de excepción); nunca
 * correos, contraseñas, códigos, tokens, selfies ni cuerpos de solicitud/respuesta.
 */
object Diag {
    const val TAG = "Solventa"

    fun i(mensaje: String) = emitir { Log.i(TAG, mensaje) }

    fun w(mensaje: String) = emitir { Log.w(TAG, mensaje) }

    fun e(mensaje: String, causa: Throwable? = null) = emitir { Log.e(TAG, mensaje, causa) }

    // En pruebas JVM android.util.Log no está implementado; el log nunca debe romper el flujo.
    private inline fun emitir(accion: () -> Unit) {
        try {
            accion()
        } catch (_: RuntimeException) {
        }
    }
}
