package com.solventa.feature.notificaciones

/**
 * Credenciales públicas de Firebase leídas de `local.properties` (vía `BuildConfig`). No hay
 * `google-services.json`: con alguna vacía, las notificaciones quedan desactivadas.
 */
data class ConfiguracionFirebase(
    val apiKey: String,
    val appId: String,
    val projectId: String,
    val senderId: String,
) {
    val estaCompleta: Boolean
        get() = apiKey.isNotBlank() && appId.isNotBlank() && projectId.isNotBlank() && senderId.isNotBlank()

    // Las credenciales no deben salir en trazas.
    override fun toString(): String = "ConfiguracionFirebase(completa=$estaCompleta)"
}
