package com.solventa.core.network

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Agrega `Authorization: Bearer <token>` a las llamadas protegidas.
 * Nunca agrega `x-authenticated-sub` ni `x-authenticated-issuer`: esos los inyecta el gateway.
 */
class AuthInterceptor(private val proveedorAccessToken: ProveedorAccessToken) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = proveedorAccessToken.actual()
        val solicitud = chain.request()
        // Una llamada con autorización explícita (p. ej. la baja del dispositivo tras limpiar la sesión) se respeta.
        if (solicitud.header("Authorization") != null) return chain.proceed(solicitud)
        return if (token.isNullOrBlank()) {
            chain.proceed(solicitud)
        } else {
            chain.proceed(solicitud.newBuilder().header("Authorization", "Bearer $token").build())
        }
    }
}
