package com.solventa.core.network

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Registra el `X-Correlation-Id` de la respuesta para poder correlacionar con los logs del
 * backend. Nunca registra cuerpos de solicitud/respuesta ni tokens.
 */
class CorrelationLoggingInterceptor(
    private val registrar: (String) -> Unit = { Log.i("bff-movil", it) },
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val respuesta = chain.proceed(chain.request())
        val correlationId = respuesta.header("X-Correlation-Id")
        if (!correlationId.isNullOrBlank()) {
            registrar("correlationId=$correlationId ruta=${chain.request().url.encodedPath} estado=${respuesta.code}")
        }
        return respuesta
    }
}
