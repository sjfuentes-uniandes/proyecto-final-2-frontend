package com.solventa.app

import android.content.Context

class PolizasConocidasPreferencias(contexto: Context) : PolizasConocidas {
    private val preferencias =
        contexto.applicationContext.getSharedPreferences("solventa_polizas_conocidas", Context.MODE_PRIVATE)

    override fun leer(): Set<String>? = preferencias.getStringSet(CLAVE, null)?.toSet()

    override fun guardar(ids: Set<String>) {
        preferencias.edit().putStringSet(CLAVE, ids).apply()
    }

    private companion object {
        const val CLAVE = "ids"
    }
}
