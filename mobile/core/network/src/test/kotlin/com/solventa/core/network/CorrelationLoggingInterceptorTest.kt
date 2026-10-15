package com.solventa.core.network

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CorrelationLoggingInterceptorTest {
    private lateinit var servidor: MockWebServer

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    @Test
    fun `registra el correlationId sin el cuerpo ni tokens de la respuesta`() {
        servidor.enqueue(
            MockResponse().setResponseCode(200).setHeader("X-Correlation-Id", "corr-123")
                .setBody("""{"accessToken":"secreto-no-debe-aparecer-en-logs"}"""),
        )
        val mensajesRegistrados = mutableListOf<String>()
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(CorrelationLoggingInterceptor { mensajesRegistrados += it })
            .build()
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/sesion")).build()

        cliente.newCall(solicitud).execute().use { it.body?.string() }

        assertTrue(mensajesRegistrados.any { it.contains("corr-123") })
        assertFalse(mensajesRegistrados.any { it.contains("secreto-no-debe-aparecer-en-logs") })
    }

    @Test
    fun `sin encabezado de correlacion no registra nada`() {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("{}"))
        val mensajesRegistrados = mutableListOf<String>()
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(CorrelationLoggingInterceptor { mensajesRegistrados += it })
            .build()
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/sesion")).build()

        cliente.newCall(solicitud).execute().use { it.body?.string() }

        assertTrue(mensajesRegistrados.isEmpty())
    }
}
