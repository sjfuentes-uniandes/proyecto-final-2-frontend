package com.solventa.feature.notificaciones

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging

/** Inicialización manual de Firebase (sin el plugin google-services ni JSON en el repo). */
object InicializadorFirebase {
    /**
     * Devuelve el proveedor real si la configuración está completa y Firebase arranca; de lo
     * contrario [NotificacionesSinConfigurar]. Nunca lanza: la app debe arrancar siempre.
     */
    fun inicializar(contexto: Context, configuracion: ConfiguracionFirebase): ProveedorTokenPush {
        if (!configuracion.estaCompleta) return NotificacionesSinConfigurar
        return try {
            val app = FirebaseApp.getApps(contexto).firstOrNull()
                ?: FirebaseApp.initializeApp(contexto, opciones(configuracion))
            if (app == null) {
                NotificacionesSinConfigurar
            } else {
                ProveedorTokenFirebase { app.get(FirebaseMessaging::class.java).token }
            }
        } catch (e: RuntimeException) {
            NotificacionesSinConfigurar
        }
    }

    private fun opciones(configuracion: ConfiguracionFirebase): FirebaseOptions = FirebaseOptions.Builder()
        .setApiKey(configuracion.apiKey)
        .setApplicationId(configuracion.appId)
        .setProjectId(configuracion.projectId)
        .setGcmSenderId(configuracion.senderId)
        .build()
}
