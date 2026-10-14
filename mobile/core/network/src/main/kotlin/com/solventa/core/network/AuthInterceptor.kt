package com.solventa.core.network

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Agrega `Authorization: Bearer <accessToken>` a las llamadas protegidas.
 * Nunca agrega `x-authenticated-sub` ni `x-authenticated-issuer`: esos los inyecta el gateway.
 */
class AuthInterceptor(private val proveedorAccessToken: ProveedorAccessToken) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = proveedorAccessToken.actual()
        val solicitud = chain.request()
        return if (token.isNullOrBlank()) {
            chain.proceed(solicitud)
        } else {
            chain.proceed(solicitud.newBuilder().header("Authorization", "Bearer $token").build())
        }
    }
}
