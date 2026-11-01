package com.solventa.core.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** HU-M11: registro y baja de dispositivos push contra una API simulada (MockWebServer). */
class BffMovilClienteDispositivosTest {
    private lateinit var servidor: MockWebServer
    private lateinit var cliente: BffMovilCliente

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        cliente = BffMovilCliente(RedModule.crearApi(servidor.url("/").toString()) { "token-de-prueba" })
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    private fun error(estado: Int, codigo: String) {
        servidor.enqueue(
            MockResponse().setResponseCode(estado).setBody(
                """{"codigo":"$codigo","mensaje":"m","correlationId":null,"detalles":{}}""",
            ),
        )
    }

    @Test
    fun `registro 201 devuelve el dispositivoId y el token va en el cuerpo, no en la URL`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(201).setBody("""{"dispositivoId":"$ID","extra":1}"""))

        val resultado = cliente.registrarDispositivo(TOKEN_PUSH)

        assertEquals(ResultadoDispositivo.Exito(ID), resultado)
        val peticion = servidor.takeRequest()
        assertEquals("POST", peticion.method)
        assertEquals("/v1/dispositivos", peticion.path)
        assertFalse(peticion.requestUrl.toString().contains(TOKEN_PUSH))
        assertTrue(peticion.requestUrl!!.queryParameterNames.isEmpty())
        assertEquals("""{"token":"$TOKEN_PUSH"}""", peticion.body.readUtf8())
        assertFalse(peticion.headers.names().any { it.equals("x-authenticated-sub", ignoreCase = true) })
    }

    @Test
    fun `repetir el registro devuelve el mismo dispositivoId`() = runTest {
        repeat(2) { servidor.enqueue(MockResponse().setResponseCode(201).setBody("""{"dispositivoId":"$ID"}""")) }

        val primero = cliente.registrarDispositivo(TOKEN_PUSH)
        val segundo = cliente.registrarDispositivo(TOKEN_PUSH)

        assertEquals(primero, segundo)
        assertEquals(ResultadoDispositivo.Exito(ID), segundo)
    }

    @Test
    fun `registro 400 es SolicitudInvalida`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(400).setBody("""{"codigo":"ERROR_HTTP","mensaje":"m"}"""))

        assertIs<ResultadoDispositivo.SolicitudInvalida>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro 401 es SesionInvalida`() = runTest {
        error(401, "NO_AUTENTICADO")

        assertIs<ResultadoDispositivo.SesionInvalida>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro 403 ROL_NO_AUTORIZADO es SesionInvalida`() = runTest {
        error(403, "ROL_NO_AUTORIZADO")

        assertIs<ResultadoDispositivo.SesionInvalida>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro 404 CLIENTE_NO_ENCONTRADO es SesionInvalida`() = runTest {
        error(404, "CLIENTE_NO_ENCONTRADO")

        assertIs<ResultadoDispositivo.SesionInvalida>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro 422 SOLICITUD_INVALIDA es SolicitudInvalida`() = runTest {
        error(422, "SOLICITUD_INVALIDA")

        assertIs<ResultadoDispositivo.SolicitudInvalida>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro 503 es ServicioNoDisponible`() = runTest {
        error(503, "SERVICIO_NO_DISPONIBLE")

        assertIs<ResultadoDispositivo.ServicioNoDisponible>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro sin cuerpo de error decide el estado HTTP`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(401))
        servidor.enqueue(MockResponse().setResponseCode(500).setBody("<html>"))

        assertIs<ResultadoDispositivo.SesionInvalida>(cliente.registrarDispositivo(TOKEN_PUSH))
        assertIs<ResultadoDispositivo.ErrorDesconocido>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro sin red es SinConexion`() = runTest {
        servidor.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))

        assertIs<ResultadoDispositivo.SinConexion>(cliente.registrarDispositivo(TOKEN_PUSH))
    }

    @Test
    fun `registro con JSON invalido es ErrorDesconocido sin crash`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(201).setBody("no es json"))
        servidor.enqueue(MockResponse().setResponseCode(201).setBody("""{"otroCampo":"x"}"""))
        servidor.enqueue(MockResponse().setResponseCode(201).setBody("""{"dispositivoId":""}"""))

        repeat(3) { assertIs<ResultadoDispositivo.ErrorDesconocido>(cliente.registrarDispositivo(TOKEN_PUSH)) }
    }

    @Test
    fun `los resultados y el DTO no exponen token ni dispositivoId al imprimirse`() {
        val texto = listOf(
            ResultadoDispositivo.Exito(ID).toString(),
            com.solventa.core.network.modelo.SolicitudRegistroDispositivoDto(TOKEN_PUSH).toString(),
            com.solventa.core.network.modelo.DispositivoDto(ID).toString(),
        ).joinToString()

        assertFalse(texto.contains(TOKEN_PUSH))
        assertFalse(texto.contains(ID))
    }

    @Test
    fun `baja 204 sin cuerpo es Exito y usa el id en la ruta`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(204))

        val resultado = cliente.darDeBajaDispositivo(ID, "Bearer $TOKEN_ACCESO")

        assertEquals(ResultadoBajaDispositivo.Exito, resultado)
        val peticion = servidor.takeRequest()
        assertEquals("DELETE", peticion.method)
        assertEquals("/v1/dispositivos/$ID", peticion.path)
    }

    @Test
    fun `baja con Authorization explicito lo envia cuando la sesion ya no tiene token`() = runTest {
        val sinSesion = BffMovilCliente(RedModule.crearApi(servidor.url("/").toString()) { null })
        servidor.enqueue(MockResponse().setResponseCode(204))

        sinSesion.darDeBajaDispositivo(ID, "Bearer $TOKEN_ACCESO")

        assertEquals("Bearer $TOKEN_ACCESO", servidor.takeRequest().getHeader("Authorization"))
    }

    @Test
    fun `baja sin Authorization explicito no envia el encabezado si no hay sesion`() = runTest {
        val sinSesion = BffMovilCliente(RedModule.crearApi(servidor.url("/").toString()) { null })
        servidor.enqueue(MockResponse().setResponseCode(204))

        sinSesion.darDeBajaDispositivo(ID)

        assertNull(servidor.takeRequest().getHeader("Authorization"))
    }

    @Test
    fun `baja con fallos del servidor se tolera`() = runTest {
        error(401, "NO_AUTENTICADO")
        error(403, "ROL_NO_AUTORIZADO")
        error(403, "DISPOSITIVO_NO_AUTORIZADO")
        error(404, "CLIENTE_NO_ENCONTRADO")
        error(404, "DISPOSITIVO_NO_ENCONTRADO")
        error(422, "SOLICITUD_INVALIDA")
        error(503, "SERVICIO_NO_DISPONIBLE")
        servidor.enqueue(MockResponse().setResponseCode(500).setBody("<html>"))

        repeat(8) { assertEquals(ResultadoBajaDispositivo.Tolerado, cliente.darDeBajaDispositivo(ID, "Bearer x")) }
    }

    @Test
    fun `baja sin red se tolera`() = runTest {
        servidor.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))

        assertEquals(ResultadoBajaDispositivo.Tolerado, cliente.darDeBajaDispositivo(ID))
    }

    private companion object {
        const val ID = "11111111-1111-4111-8111-111111111111"
        const val TOKEN_PUSH = "fcm-token-secreto-abc123"
        const val TOKEN_ACCESO = "access-token-xyz"
    }
}
