package com.solventa.core.auth

/**
 * Puerto hacia el proveedor de identidad (Cognito, pool `clientes`). `GestorSesion` solo conoce
 * esta interfaz; la integración real con el SDK vive en `CognitoClienteIdentidad`.
 */
interface ClienteIdentidad {
    /** Primer paso del ingreso: usuario y contraseña (SRP). */
    suspend fun autenticar(usuario: String, contrasena: String): ResultadoAutenticacion

    /** Responde al reto de MFA emitido tras [autenticar] cuando devuelve `CodigoMfaRequerido`. */
    suspend fun confirmarCodigoMfa(codigo: String): ResultadoAutenticacion

    /**
     * Intenta recuperar en silencio la sesión del último usuario autenticado en este
     * dispositivo, usando el token de refresco que el SDK ya cachea localmente. No pide
     * contraseña: si no hay una sesión válida en caché, devuelve `SesionNoDisponible`.
     */
    suspend fun restaurarSesion(usuario: String): ResultadoAutenticacion

    /** Cierra la sesión local de Cognito para `usuario` (limpia su caché de tokens). */
    fun cerrarSesion(usuario: String)
}
