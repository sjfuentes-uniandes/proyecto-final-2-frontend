package com.solventa.feature.notificaciones

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** La `Application` que cablea el módulo implementa esto para que el servicio llegue al gestor. */
interface DependenciasNotificaciones {
    val gestorDispositivo: GestorDispositivo
    val ambitoApp: CoroutineScope
}

/** Servicio delgado: toda la lógica vive en [ProcesadorMensajePush] y [GestorDispositivo]. */
class ServicioMensajeriaPush : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        ProcesadorMensajePush(applicationContext).procesar(message.data)
    }

    override fun onNewToken(token: String) {
        val dependencias = applicationContext as? DependenciasNotificaciones ?: return
        dependencias.ambitoApp.launch { dependencias.gestorDispositivo.alTokenNuevo(token) }
    }
}
