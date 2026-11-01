package com.solventa.app

import android.content.Intent
import com.solventa.feature.notificaciones.ProcesadorMensajePush
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Póliza a abrir tras tocar una notificación. Vive en la app para sobrevivir a la recreación de la
 * actividad; la navegación la consume solo con sesión autenticada. Un `polizaId` que no sea UUID
 * se descarta. Que el detalle se muestre lo decide siempre el API.
 */
class DestinoPendiente {
    private val _polizaId = MutableStateFlow<String?>(null)
    val polizaId: StateFlow<String?> = _polizaId.asStateFlow()

    fun desdeIntent(intent: Intent?) {
        val id = intent?.getStringExtra(ProcesadorMensajePush.EXTRA_POLIZA_ID) ?: return
        // El extra se retira para no reprocesarlo al recrear la actividad.
        intent.removeExtra(ProcesadorMensajePush.EXTRA_POLIZA_ID)
        if (esUuid(id)) _polizaId.value = id
    }

    fun consumir() {
        _polizaId.value = null
    }

    private fun esUuid(valor: String): Boolean = try {
        UUID.fromString(valor).toString().equals(valor, ignoreCase = true)
    } catch (e: IllegalArgumentException) {
        false
    }
}
