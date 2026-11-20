package com.solventa.feature.notificaciones

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import java.util.UUID

/**
 * Simula la entrega de un push "póliza emitida" sin Firebase, en builds de debug:
 * `adb shell am broadcast -a com.solventa.app.DEBUG_AVISO_POLIZA -p com.solventa.app --es polizaId <uuid>`.
 * Sin `polizaId` usa uno aleatorio. Pasa por el mismo [ProcesadorMensajePush] que el push real.
 */
class AvisoSimuladoReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val polizaId = intent.getStringExtra(ProcesadorMensajePush.CLAVE_POLIZA_ID)
            ?: UUID.randomUUID().toString()
        ProcesadorMensajePush(context.applicationContext).procesar(
            mapOf(
                ProcesadorMensajePush.CLAVE_TIPO to ProcesadorMensajePush.TIPO_POLIZA_EMITIDA,
                ProcesadorMensajePush.CLAVE_POLIZA_ID to polizaId,
                ProcesadorMensajePush.CLAVE_EVENT_ID to UUID.randomUUID().toString(),
            ),
        )
    }

    companion object {
        const val ACCION = "com.solventa.app.DEBUG_AVISO_POLIZA"

        fun registrar(contexto: Context) {
            val filtro = IntentFilter(ACCION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                contexto.registerReceiver(AvisoSimuladoReceiver(), filtro, Context.RECEIVER_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                contexto.registerReceiver(AvisoSimuladoReceiver(), filtro)
            }
        }
    }
}
