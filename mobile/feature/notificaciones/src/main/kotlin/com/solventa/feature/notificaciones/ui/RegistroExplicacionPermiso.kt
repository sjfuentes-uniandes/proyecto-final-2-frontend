package com.solventa.feature.notificaciones.ui

import android.content.Context

/** Recuerda si ya se explicó el permiso, para no insistir en cada visita a la billetera. */
interface RegistroExplicacionPermiso {
    fun yaMostrada(): Boolean

    fun marcarMostrada()
}

class RegistroExplicacionPermisoPreferencias(context: Context) : RegistroExplicacionPermiso {
    private val preferencias =
        context.applicationContext.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)

    override fun yaMostrada(): Boolean = preferencias.getBoolean(CLAVE, false)

    override fun marcarMostrada() {
        preferencias.edit().putBoolean(CLAVE, true).apply()
    }

    private companion object {
        const val ARCHIVO = "solventa_notificaciones_permiso"
        const val CLAVE = "explicacion_mostrada"
    }
}

object EtiquetasPermisoNotificaciones {
    const val DIALOGO = "permiso_notificaciones_dialogo"
    const val ACTIVAR = "permiso_notificaciones_activar"
    const val AHORA_NO = "permiso_notificaciones_ahora_no"
}
