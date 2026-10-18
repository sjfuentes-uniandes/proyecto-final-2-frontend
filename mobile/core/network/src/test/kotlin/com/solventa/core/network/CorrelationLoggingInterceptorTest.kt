package com.solventa.core.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
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
            .addInterceptor(CorrelationLoggingInterceptor({ mensajesRegistrados += it }))
            .build()
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/sesion")).build()

        cliente.newCall(solicitud).execute().use { it.body?.string() }

        assertTrue(mensajesRegistrados.any { it.contains("corr-123") })
        assertFalse(mensajesRegistrados.any { it.contains("secreto-no-debe-aparecer-en-logs") })
    }

    @Test
    fun `sin encabezado de correlacion registra la llamada sin correlationId ni query`() {
        servidor.enqueue(MockResponse().setResponseCode(503).setBody("{}"))
        val mensajesRegistrados = mutableListOf<String>()
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(CorrelationLoggingInterceptor({ mensajesRegistrados += it }))
            .build()
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/sesion?token=secreto")).build()

        cliente.newCall(solicitud).execute().use { it.body?.string() }

        val mensaje = mensajesRegistrados.single()
        assertTrue(mensaje.contains("GET /v1/sesion estado=503"))
        assertFalse(mensaje.contains("correlationId"))
        assertFalse(mensaje.contains("secreto"))
    }

    @Test
    fun `registra el fallo de red y lo propaga`() {
        val fallos = mutableListOf<String>()
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(CorrelationLoggingInterceptor({}, { fallos += it }))
            .build()
        val url = servidor.url("/v1/sesion")
        servidor.shutdown()

        val propagado = runCatching { cliente.newCall(okhttp3.Request.Builder().url(url).build()).execute() }.exceptionOrNull()

        assertTrue(propagado is java.io.IOException)
        assertTrue(fallos.single().contains("GET /v1/sesion fallo="))
    }

    @Test
    fun `no registra el cuerpo de la solicitud, por ejemplo una selfie`() {
        servidor.enqueue(MockResponse().setResponseCode(200).setHeader("X-Correlation-Id", "corr-1").setBody("{}"))
        val mensajesRegistrados = mutableListOf<String>()
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(CorrelationLoggingInterceptor({ mensajesRegistrados += it }))
            .build()
        val cuerpo = """{"selfie":"selfie-secreta-que-no-debe-aparecer-en-logs"}"""
            .toRequestBody("application/json".toMediaType())
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/identidad/verificaciones")).post(cuerpo).build()

        cliente.newCall(solicitud).execute().use { it.body?.string() }

        assertTrue(mensajesRegistrados.isNotEmpty())
        assertFalse(mensajesRegistrados.any { it.contains("selfie-secreta") })
    }
}
