package com.solventa.core.network

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * Registra cada llamada al BFF (método, ruta, estado, duración y `X-Correlation-Id` si viene) y los
 * fallos de red, para poder correlacionar con los logs del backend. Nunca registra cuerpos de
 * solicitud/respuesta, parámetros de la URL ni tokens.
 */
class CorrelationLoggingInterceptor(
    private val registrar: (String) -> Unit = { Diag.i(it) },
    private val registrarFallo: (String) -> Unit = { Diag.e(it) },
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val solicitud = chain.request()
        val destino = "${solicitud.method} ${solicitud.url.encodedPath}"
        val inicio = System.nanoTime()
        val respuesta = try {
            chain.proceed(solicitud)
        } catch (e: IOException) {
            registrarFallo("http $destino fallo=${e.javaClass.simpleName} ms=${milisDesde(inicio)}")
            throw e
        }
        val correlationId = respuesta.header("X-Correlation-Id")
        val correlacion = if (correlationId.isNullOrBlank()) "" else " correlationId=$correlationId"
        registrar("http $destino estado=${respuesta.code} ms=${milisDesde(inicio)}$correlacion")
        return respuesta
    }

    private fun milisDesde(inicioNanos: Long) = (System.nanoTime() - inicioNanos) / 1_000_000
}
