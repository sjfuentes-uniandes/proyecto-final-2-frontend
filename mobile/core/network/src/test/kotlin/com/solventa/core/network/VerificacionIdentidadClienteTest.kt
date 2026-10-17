package com.solventa.core.network

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlinx.coroutines.test.runTest
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class VerificacionIdentidadClienteTest {
    private lateinit var servidor: MockWebServer
    private lateinit var cliente: VerificacionIdentidadCliente

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        val api = RedModule.crearApi(servidor.url("/").toString()) { "token-de-prueba" }
        cliente = VerificacionIdentidadCliente(api)
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    private fun responder(codigo: Int, cuerpo: String) {
        servidor.enqueue(MockResponse().setResponseCode(codigo).setBody(cuerpo))
    }

    @Test
    fun `envia POST con la selfie y la prueba de vida en JSON`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"APROBADO","motivo":null,"verificadoEn":"2026-10-15T10:00:00Z"}""")

        cliente.verificar("selfie-sintetica-aprobada", pruebaDeVidaCompletada = true)

        val recibida = servidor.takeRequest()
        assertEquals("POST", recibida.method)
        assertEquals("/v1/identidad/verificaciones", recibida.path)
        assertTrue(recibida.getHeader("Content-Type").orEmpty().startsWith("application/json"))
        val cuerpo = recibida.body.readUtf8()
        assertTrue(cuerpo.contains(""""selfie":"selfie-sintetica-aprobada""""))
        assertTrue(cuerpo.contains(""""pruebaDeVida":{"completado":true}"""))
    }

    @Test
    fun `200 APROBADO y VERIFICADO devuelve Aprobada (AC1)`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"APROBADO","motivo":null,"verificadoEn":"2026-10-15T10:00:00Z"}""")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.Aprobada>(resultado)
        assertEquals("c1", resultado.clienteId)
        assertEquals("2026-10-15T10:00:00Z", resultado.verificadoEn)
    }

    @Test
    fun `200 APROBADO con estado distinto de VERIFICADO nunca aprueba`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"PENDIENTE","resultado":"APROBADO","motivo":null,"verificadoEn":null}""")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.ErrorDesconocido>(resultado)
    }

    @Test
    fun `200 CAPTURA_INVALIDA devuelve CapturaInvalida con el motivo, no un rechazo (AC2)`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"PENDIENTE","resultado":"CAPTURA_INVALIDA","motivo":"ILUMINACION_INSUFICIENTE","verificadoEn":null}""")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.CapturaInvalida>(resultado)
        assertEquals("ILUMINACION_INSUFICIENTE", resultado.motivo)
    }

    @Test
    fun `200 RECHAZADO devuelve Rechazada con el motivo`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"RECHAZADO","resultado":"RECHAZADO","motivo":"ROSTRO_NO_COINCIDE","verificadoEn":null}""")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.Rechazada>(resultado)
        assertEquals("ROSTRO_NO_COINCIDE", resultado.motivo)
    }

    @Test
    fun `200 con un resultado desconocido es ErrorDesconocido y no aprueba`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"OTRO","motivo":null,"verificadoEn":null}""")

        assertIs<ResultadoVerificacion.ErrorDesconocido>(cliente.verificar("selfie", true))
    }

    @Test
    fun `503 SERVICIO_NO_DISPONIBLE es recuperable y conserva el correlationId (AC3)`() = runTest {
        responder(503, """{"codigo":"SERVICIO_NO_DISPONIBLE","mensaje":"proveedor caido","correlationId":"corr-9","detalles":{}}""")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.ServicioNoDisponible>(resultado)
        assertEquals("corr-9", resultado.correlationId)
        assertTrue(resultado.esRecuperable)
    }

    @Test
    fun `503 sin cuerpo del contrato (pasarela) tambien es ServicioNoDisponible`() = runTest {
        responder(503, "<html>Bad Gateway</html>")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.ServicioNoDisponible>(resultado)
    }

    @Test
    fun `se traduce por codigo y no por el mensaje`() = runTest {
        responder(401, """{"codigo":"NO_AUTENTICADO","mensaje":"El servicio no esta disponible","correlationId":null,"detalles":{}}""")

        assertIs<ResultadoVerificacion.NoAutenticado>(cliente.verificar("selfie", true))
    }

    @Test
    fun `403 ROL_NO_AUTORIZADO no es recuperable`() = runTest {
        responder(403, """{"codigo":"ROL_NO_AUTORIZADO","mensaje":"x","correlationId":null,"detalles":{}}""")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.RolNoAutorizado>(resultado)
        assertFalse(resultado.esRecuperable)
    }

    @Test
    fun `422 SOLICITUD_INVALIDA devuelve SolicitudInvalida`() = runTest {
        responder(422, """{"codigo":"SOLICITUD_INVALIDA","mensaje":"x","correlationId":null,"detalles":{"campos":["selfie"]}}""")

        assertIs<ResultadoVerificacion.SolicitudInvalida>(cliente.verificar("", true))
    }

    @Test
    fun `un codigo de error desconocido es ErrorDesconocido`() = runTest {
        responder(500, """{"codigo":"INESPERADO","mensaje":"x","correlationId":"c","detalles":{}}""")

        val resultado = cliente.verificar("selfie", true)

        assertIs<ResultadoVerificacion.ErrorDesconocido>(resultado)
        assertEquals("c", resultado.correlationId)
    }

    @Test
    fun `200 con cuerpo ilegible no revienta y es ErrorDesconocido`() = runTest {
        responder(200, """{"esto":"no es el contrato"}""")

        assertIs<ResultadoVerificacion.ErrorDesconocido>(cliente.verificar("selfie", true))
    }

    @Test
    fun `sin red (servidor caido) devuelve SinConexion recuperable (AC3)`() = runTest {
        servidor.shutdown()

        val resultado = cliente.verificar("selfie", true)

        assertEquals(ResultadoVerificacion.SinConexion, resultado)
        assertTrue(resultado.esRecuperable)
    }

    @Test
    fun `la solicitud nunca expone la selfie en toString`() {
        val solicitud = com.solventa.core.network.modelo.VerificacionIdentidadSolicitud(
            selfie = "contenido-secreto-de-la-selfie",
            pruebaDeVida = com.solventa.core.network.modelo.PruebaDeVidaDto(completado = true),
        )

        assertFalse(solicitud.toString().contains("contenido-secreto-de-la-selfie"))
    }

    @Test
    fun `sin subLocal no se envia X-Authenticated-Sub`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"APROBADO"}""")

        cliente.verificar("selfie", true)

        assertNull(servidor.takeRequest().getHeader("X-Authenticated-Sub"))
    }

    @Test
    fun `con subLocal se envia X-Authenticated-Sub solo para desarrollo local`() = runTest {
        val api = RedModule.crearApi(servidor.url("/").toString(), subLocal = "persona-de-prueba-1") { null }
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"APROBADO"}""")

        VerificacionIdentidadCliente(api).verificar("selfie", true)

        assertEquals("persona-de-prueba-1", servidor.takeRequest().getHeader("X-Authenticated-Sub"))
    }
}
