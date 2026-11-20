package com.solventa.feature.notificaciones

import android.content.Context
import java.util.UUID

/**
 * Token push inventado para desarrollo sin Firebase: permite probar el registro del dispositivo
 * contra un backend con proveedor push simulado. Se conserva entre ejecuciones para no crear un
 * dispositivo nuevo en cada arranque. Solo debe usarse en builds de debug.
 */
class ProveedorTokenSimulado(contexto: Context) : ProveedorTokenPush {
    private val preferencias =
        contexto.applicationContext.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)

    override suspend fun obtenerToken(): String =
        preferencias.getString(CLAVE, null) ?: "$PREFIJO${UUID.randomUUID()}".also {
            preferencias.edit().putString(CLAVE, it).apply()
        }

    private companion object {
        const val ARCHIVO = "solventa_token_push_simulado"
        const val CLAVE = "token"
        const val PREFIJO = "token-simulado-"
    }
}
