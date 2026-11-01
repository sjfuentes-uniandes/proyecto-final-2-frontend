package com.solventa.feature.notificaciones

import com.google.android.gms.tasks.Task
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/** Adaptador real sobre FCM; `solicitarToken` se inyecta para probarlo sin Google Play Services. */
class ProveedorTokenFirebase(
    private val solicitarToken: () -> Task<String>,
) : ProveedorTokenPush {
    override suspend fun obtenerToken(): String? = suspendCancellableCoroutine { continuacion ->
        try {
            // Ejecutor directo: no hace falta saltar al hilo principal solo para reanudar.
            solicitarToken().addOnCompleteListener({ it.run() }) { tarea ->
                val token = if (tarea.isSuccessful) tarea.result else null
                continuacion.resume(token?.takeIf { it.isNotBlank() })
            }
        } catch (e: RuntimeException) {
            continuacion.resume(null)
        }
    }
}
