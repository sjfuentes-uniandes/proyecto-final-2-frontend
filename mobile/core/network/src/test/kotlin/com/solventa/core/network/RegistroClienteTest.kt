package com.solventa.core.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertTrue

class RegistroClienteTest {
    private lateinit var servidor: MockWebServer
    private lateinit var cliente: RegistroCliente

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        cliente = RegistroCliente(RedModule.crearApi(servidor.url("/").toString()) { null })
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    private fun responder(codigo: Int, cuerpo: String) {
        servidor.enqueue(MockResponse().setResponseCode(codigo).setBody(cuerpo))
    }

    private fun error(codigo: String, detalles: String = "{}") =
        """{"codigo":"$codigo","mensaje":"x","correlationId":"cid-1","detalles":$detalles}"""

    private suspend fun verificar() = cliente.verificar("reg-1", "a@b.co", "selfie-sintetica-aprobada", true)

    @Test
    fun `envia registroId correo selfie y prueba de vida sin Authorization`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"APROBADO","tokenRegistro":"v1.t","expiraEn":"2026-10-16T05:38:14Z"}""")

        verificar()

        val recibida = servidor.takeRequest()
        assertEquals("/v1/registro/verificaciones", recibida.path)
        assertEquals(null, recibida.getHeader("Authorization"))
        val cuerpo = recibida.body.readUtf8()
        assertTrue(cuerpo.contains(""""registroId":"reg-1""""))
        assertTrue(cuerpo.contains(""""correo":"a@b.co""""))
        assertTrue(cuerpo.contains(""""pruebaDeVida":{"completado":true}"""))
    }

    @Test
    fun `VERIFICADO con token devuelve Verificada`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"APROBADO","tokenRegistro":"v1.t","expiraEn":"e"}""")

        val resultado = verificar()

        assertIs<ResultadoVerificacionRegistro.Verificada>(resultado)
        assertEquals("v1.t", resultado.tokenRegistro)
        assertFalse(resultado.toString().contains("v1.t"))
    }

    @Test
    fun `VERIFICADO sin token nunca habilita el registro`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","resultado":"APROBADO","tokenRegistro":null}""")

        assertIs<ResultadoVerificacionRegistro.ErrorDesconocido>(verificar())
    }

    @Test
    fun `captura invalida y rechazo se distinguen`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"PENDIENTE","resultado":"CAPTURA_INVALIDA","motivo":"ILUMINACION_INSUFICIENTE"}""")
        responder(200, """{"clienteId":"c1","estado":"RECHAZADO","resultado":"RECHAZADO","motivo":"ROSTRO_NO_COINCIDE"}""")

        assertEquals(ResultadoVerificacionRegistro.CapturaInvalida("ILUMINACION_INSUFICIENTE"), verificar())
        assertEquals(ResultadoVerificacionRegistro.Rechazada("ROSTRO_NO_COINCIDE"), verificar())
    }

    @Test
    fun `errores de verificacion se traducen por codigo`() = runTest {
        responder(503, error("SERVICIO_NO_DISPONIBLE"))
        responder(409, error("REGISTRO_CORREO_DISTINTO"))
        responder(409, error("REGISTRO_YA_VINCULADO"))
        responder(422, error("SOLICITUD_INVALIDA", """{"campos":["correo"]}"""))
        responder(429, "")

        val servicio = verificar()
        assertIs<ResultadoVerificacionRegistro.ServicioNoDisponible>(servicio)
        assertTrue(servicio.esRecuperable)
        assertIs<ResultadoVerificacionRegistro.CorreoDistinto>(verificar())
        assertIs<ResultadoVerificacionRegistro.YaVinculado>(verificar())
        assertEquals(listOf("correo"), assertIs<ResultadoVerificacionRegistro.SolicitudInvalida>(verificar()).campos)
        assertIs<ResultadoVerificacionRegistro.DemasiadosIntentos>(verificar())
    }

    @Test
    fun `vincular envia registroId y token y devuelve Vinculada`() = runTest {
        responder(200, """{"clienteId":"c1","estado":"VERIFICADO","verificadoEn":"e"}""")

        val resultado = cliente.vincular("reg-1", "v1.t")

        assertEquals(ResultadoVinculacion.Vinculada("c1"), resultado)
        val recibida = servidor.takeRequest()
        assertEquals("/v1/registro/vinculacion", recibida.path)
        assertTrue(recibida.body.readUtf8().contains(""""tokenRegistro":"v1.t""""))
    }

    @Test
    fun `errores de vinculacion se traducen por codigo y motivo`() = runTest {
        responder(401, error("NO_AUTENTICADO"))
        responder(403, error("TOKEN_REGISTRO_INVALIDO", """{"motivo":"VENCIDO"}"""))
        responder(409, error("REGISTRO_YA_VINCULADO"))
        responder(503, error("SERVICIO_NO_DISPONIBLE"))

        assertIs<ResultadoVinculacion.NoAutenticado>(cliente.vincular("r", "t"))
        assertEquals(MotivoTokenRegistro.VENCIDO, assertIs<ResultadoVinculacion.TokenInvalido>(cliente.vincular("r", "t")).motivo)
        assertIs<ResultadoVinculacion.YaVinculado>(cliente.vincular("r", "t"))
        assertTrue(assertIs<ResultadoVinculacion.ServicioNoDisponible>(cliente.vincular("r", "t")).esRecuperable)
    }

    @Test
    fun `sin conexion es recuperable`() = runTest {
        servidor.shutdown()

        assertEquals(ResultadoVerificacionRegistro.SinConexion, verificar())
        assertEquals(ResultadoVinculacion.SinConexion, cliente.vincular("r", "t"))
    }

    @Test
    fun `validarLocal es true solo con valido true`() = runTest {
        responder(200, """{"valido":true,"expiraEn":"e"}""")
        responder(403, error("TOKEN_REGISTRO_INVALIDO", """{"motivo":"CORREO"}"""))

        assertTrue(cliente.validarLocal("t", "a@b.co"))
        assertFalse(cliente.validarLocal("t", "otro@b.co"))
    }

    @Test
    fun `los modelos no imprimen datos sensibles`() {
        val s = com.solventa.core.network.modelo.RegistroVerificacionSolicitud(
            "reg-secreto", "a@b.co", "SELFIE", com.solventa.core.network.modelo.PruebaDeVidaDto(true),
        ).toString()

        assertFalse(s.contains("reg-secreto") || s.contains("a@b.co") || s.contains("SELFIE"))
    }
}
