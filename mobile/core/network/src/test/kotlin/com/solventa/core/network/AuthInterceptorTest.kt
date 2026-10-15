package com.solventa.core.network

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AuthInterceptorTest {
    private lateinit var servidor: MockWebServer

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("{}"))
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    @Test
    fun `agrega Authorization Bearer con el token actual`() {
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor { "mi-access-token" })
            .build()
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/sesion")).build()

        cliente.newCall(solicitud).execute().close()

        val recibida = servidor.takeRequest()
        assertEquals("Bearer mi-access-token", recibida.getHeader("Authorization"))
    }

    @Test
    fun `nunca agrega x-authenticated-sub ni x-authenticated-issuer`() {
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor { "mi-access-token" })
            .build()
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/sesion")).build()

        cliente.newCall(solicitud).execute().close()

        val recibida = servidor.takeRequest()
        assertNull(recibida.getHeader("x-authenticated-sub"))
        assertNull(recibida.getHeader("x-authenticated-issuer"))
    }

    @Test
    fun `sin token no agrega el encabezado Authorization`() {
        val cliente = okhttp3.OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor { null })
            .build()
        val solicitud = okhttp3.Request.Builder().url(servidor.url("/v1/sesion")).build()

        cliente.newCall(solicitud).execute().close()

        val recibida = servidor.takeRequest()
        assertNull(recibida.getHeader("Authorization"))
    }
}
