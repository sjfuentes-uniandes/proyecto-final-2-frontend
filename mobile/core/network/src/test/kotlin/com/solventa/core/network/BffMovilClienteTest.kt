package com.solventa.core.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class BffMovilClienteTest {
    private lateinit var servidor: MockWebServer
    private lateinit var cliente: BffMovilCliente

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        val api = RedModule.crearApi(servidor.url("/").toString()) { "token-de-prueba" }
        cliente = BffMovilCliente(api)
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    @Test
    fun `200 con serviciosAutorizados devuelve Exito`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"clienteId":"c1b1c1b1-0000-0000-0000-000000000000","serviciosAutorizados":["POLIZAS","SINIESTROS"],"expiraEn":"2026-10-13T20:00:00Z"}""",
            ),
        )

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.Exito>(resultado)
        assertEquals(2, resultado.sesion.serviciosAutorizados.size)
    }

    @Test
    fun `200 con serviciosAutorizados vacio tambien es Exito`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"clienteId":"c1b1c1b1-0000-0000-0000-000000000000","serviciosAutorizados":[],"expiraEn":"2026-10-13T20:00:00Z"}""",
            ),
        )

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.Exito>(resultado)
        assertTrue(resultado.sesion.serviciosAutorizados.isEmpty())
    }

    @Test
    fun `401 NO_AUTENTICADO devuelve NoAutenticado con el mensaje del ErrorDto`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(401).setBody(
                """{"codigo":"NO_AUTENTICADO","mensaje":"El token venció","correlationId":"abc","detalles":{}}""",
            ),
        )

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.NoAutenticado>(resultado)
        assertEquals("El token venció", resultado.mensaje)
    }

    @Test
    fun `403 ROL_NO_AUTORIZADO devuelve RolNoAutorizado`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(403).setBody(
                """{"codigo":"ROL_NO_AUTORIZADO","mensaje":"El token no es del pool de clientes","correlationId":null,"detalles":{}}""",
            ),
        )

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.RolNoAutorizado>(resultado)
    }

    @Test
    fun `404 CLIENTE_NO_ENCONTRADO devuelve ClienteNoEncontrado`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(404).setBody(
                """{"codigo":"CLIENTE_NO_ENCONTRADO","mensaje":"El cliente no existe","correlationId":null,"detalles":{}}""",
            ),
        )

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.ClienteNoEncontrado>(resultado)
    }

    @Test
    fun `422 SOLICITUD_INVALIDA devuelve SolicitudInvalida`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(422).setBody(
                """{"codigo":"SOLICITUD_INVALIDA","mensaje":"Un encabezado no es válido","correlationId":null,"detalles":{}}""",
            ),
        )

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.SolicitudInvalida>(resultado)
    }

    @Test
    fun `503 SERVICIO_NO_DISPONIBLE devuelve ServicioNoDisponible`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(503).setBody(
                """{"codigo":"SERVICIO_NO_DISPONIBLE","mensaje":"No se pudo verificar la identidad","correlationId":null,"detalles":{}}""",
            ),
        )

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.ServicioNoDisponible>(resultado)
    }

    @Test
    fun `sin red (servidor caido) devuelve SinConexion`() = runTest {
        servidor.shutdown()

        val resultado = cliente.consultarSesion()

        assertIs<ResultadoSesion.SinConexion>(resultado)
    }
}
