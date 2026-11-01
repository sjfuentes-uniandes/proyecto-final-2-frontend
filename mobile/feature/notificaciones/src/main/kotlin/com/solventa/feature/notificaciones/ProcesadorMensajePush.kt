package com.solventa.feature.notificaciones

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.UUID

/**
 * Convierte el mensaje push de solo datos en una notificación local genérica: sin número de
 * póliza, producto ni montos. Ignora (sin error) lo que no cumpla el contrato.
 */
class ProcesadorMensajePush(private val contexto: Context) {

    /** Devuelve true solo si publicó la notificación. */
    fun procesar(datos: Map<String, String>): Boolean {
        if (datos[CLAVE_TIPO] != TIPO_POLIZA_EMITIDA) return false
        val polizaId = datos[CLAVE_POLIZA_ID]?.takeIf(::esUuid) ?: return false
        val eventId = datos[CLAVE_EVENT_ID]?.takeIf(::esUuid) ?: return false
        if (!puedePublicar()) return false

        crearCanal()
        val publica = NotificationCompat.Builder(contexto, CANAL_ID)
            .setSmallIcon(R.drawable.ic_notificacion)
            .setContentTitle(contexto.getString(R.string.notificaciones_publica_titulo))
            .setContentText(contexto.getString(R.string.notificaciones_publica_texto))
            .build()
        val notificacion = NotificationCompat.Builder(contexto, CANAL_ID)
            .setSmallIcon(R.drawable.ic_notificacion)
            .setContentTitle(contexto.getString(R.string.notificaciones_poliza_emitida_titulo))
            .setContentText(contexto.getString(R.string.notificaciones_poliza_emitida_texto))
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publica)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(intentApertura(polizaId))
            .build()
        return try {
            // tag = eventId e id fijo: la misma entrega repetida se fusiona en un solo aviso.
            NotificationManagerCompat.from(contexto).notify(eventId, ID_NOTIFICACION, notificacion)
            true
        } catch (e: SecurityException) {
            false
        }
    }

    private fun puedePublicar(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            contexto.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }
        return NotificationManagerCompat.from(contexto).areNotificationsEnabled()
    }

    private fun crearCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val canal = NotificationChannel(
            CANAL_ID,
            contexto.getString(R.string.notificaciones_canal_nombre),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = contexto.getString(R.string.notificaciones_canal_descripcion)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
        }
        contexto.getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }

    private fun intentApertura(polizaId: String): PendingIntent {
        val intent = (contexto.packageManager.getLaunchIntentForPackage(contexto.packageName) ?: Intent())
            .setPackage(contexto.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(EXTRA_POLIZA_ID, polizaId)
        return PendingIntent.getActivity(
            contexto,
            polizaId.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }

    private fun esUuid(valor: String): Boolean = try {
        UUID.fromString(valor).toString().equals(valor, ignoreCase = true)
    } catch (e: IllegalArgumentException) {
        false
    }

    companion object {
        const val CLAVE_TIPO = "tipo"
        const val CLAVE_POLIZA_ID = "polizaId"
        const val CLAVE_EVENT_ID = "eventId"
        const val TIPO_POLIZA_EMITIDA = "POLIZA_EMITIDA"
        const val EXTRA_POLIZA_ID = "polizaId"
        const val CANAL_ID = "polizas"
        const val ID_NOTIFICACION = 1101
    }
}
