package com.solventa.feature.notificaciones

/** Puerto para obtener el token push del dispositivo; permite probar sin Firebase real. */
fun interface ProveedorTokenPush {
    /** Devuelve el token vigente o null si no hay (sin configuración, sin Play Services, fallo). */
    suspend fun obtenerToken(): String?
}

/** No-op: Firebase sin configurar. La app arranca y el registro del dispositivo no ocurre. */
object NotificacionesSinConfigurar : ProveedorTokenPush {
    override suspend fun obtenerToken(): String? = null
}
