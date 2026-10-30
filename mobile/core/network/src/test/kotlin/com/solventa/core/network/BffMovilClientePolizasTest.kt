package com.solventa.core.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class BffMovilClientePolizasTest {
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

    private val resumen = """{"polizaId":"$ID","numero":"P-1","estado":"ACTIVA","producto":"Auto","ramo":"Vehículos",""" +
        """"vigencia":{"desde":"2026-01-01","hasta":"2027-01-01"},"vigente":true,""" +
        """"resumenCobertura":{"sumaAsegurada":"300000000.00","moneda":"COP","totalCoberturas":3},"extra":1}"""

    private val detalle = """{"numero":"P-1","estado":"ACTIVA","producto":"Auto","ramo":"Vehículos",""" +
        """"vigencia":{"desde":"2026-01-01","hasta":"2027-01-01"},"vigente":true,"prima":"1200000.50",""" +
        """"sumaAsegurada":"300000000.00","moneda":"COP","periodicidad":"MENSUAL","emitidaEn":"2026-01-01T10:00:00Z",""" +
        """"coberturas":[{"codigo":"RC","nombre":"Responsabilidad civil","obligatoria":true}],""" +
        """"credencial":{"numero":"C-1","huella":"abcdef0123456789","firmaId":"f-1",""" +
        """"vigencia":{"desde":"2026-01-01","hasta":"2027-01-01"}}}"""

    @Test
    fun `lista 200 devuelve Exito y no envia clienteId`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("[$resumen]"))

        val resultado = cliente.consultarPolizas()

        assertIs<ResultadoPolizas.Exito>(resultado)
        assertEquals(ID, resultado.polizas.single().polizaId)
        assertEquals(3, resultado.polizas.single().resumenCobertura.totalCoberturas)
        val peticion = servidor.takeRequest()
        assertEquals("/v1/polizas", peticion.path)
        assertTrue(peticion.requestUrl!!.queryParameterNames.isEmpty())
    }

    @Test
    fun `lista vacia es Exito`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("[]"))

        val resultado = cliente.consultarPolizas()

        assertIs<ResultadoPolizas.Exito>(resultado)
        assertTrue(resultado.polizas.isEmpty())
    }

    @Test
    fun `detalle 200 devuelve Exito y usa el id en la ruta`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody(detalle))

        val resultado = cliente.consultarPoliza(ID)

        assertIs<ResultadoPoliza.Exito>(resultado)
        assertEquals("C-1", resultado.poliza.credencial.numero)
        assertEquals("/v1/polizas/$ID", servidor.takeRequest().path)
    }

    @Test
    fun `401 NO_AUTENTICADO`() = runTest {
        error(401, "NO_AUTENTICADO")
        assertIs<ResultadoPolizas.NoAutenticado>(cliente.consultarPolizas())
    }

    @Test
    fun `403 ROL_NO_AUTORIZADO es NoAutenticado`() = runTest {
        error(403, "ROL_NO_AUTORIZADO")
        assertIs<ResultadoPolizas.NoAutenticado>(cliente.consultarPolizas())
    }

    @Test
    fun `403 POLIZA_NO_AUTORIZADA es PolizaNoAutorizada y no NoAutenticado`() = runTest {
        error(403, "POLIZA_NO_AUTORIZADA")
        assertIs<ResultadoPoliza.PolizaNoAutorizada>(cliente.consultarPoliza(ID))
    }

    @Test
    fun `404 CLIENTE_NO_ENCONTRADO`() = runTest {
        error(404, "CLIENTE_NO_ENCONTRADO")
        assertIs<ResultadoPolizas.ClienteNoEncontrado>(cliente.consultarPolizas())
    }

    @Test
    fun `404 POLIZA_NO_ENCONTRADA se distingue del 404 de cliente`() = runTest {
        error(404, "POLIZA_NO_ENCONTRADA")
        assertIs<ResultadoPoliza.PolizaNoEncontrada>(cliente.consultarPoliza(ID))
        error(404, "CLIENTE_NO_ENCONTRADO")
        assertIs<ResultadoPoliza.ClienteNoEncontrado>(cliente.consultarPoliza(ID))
    }

    @Test
    fun `422 SOLICITUD_INVALIDA`() = runTest {
        error(422, "SOLICITUD_INVALIDA")
        assertIs<ResultadoPoliza.SolicitudInvalida>(cliente.consultarPoliza("no-es-uuid"))
    }

    @Test
    fun `503 SERVICIO_NO_DISPONIBLE`() = runTest {
        error(503, "SERVICIO_NO_DISPONIBLE")
        assertIs<ResultadoPolizas.ServicioNoDisponible>(cliente.consultarPolizas())
    }

    @Test
    fun `codigo desconocido es ErrorDesconocido`() = runTest {
        error(500, "OTRO")
        assertIs<ResultadoPolizas.ErrorDesconocido>(cliente.consultarPolizas())
    }

    @Test
    fun `sin cuerpo legible decide el HTTP`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(401).setBody("no es json"))
        assertIs<ResultadoPolizas.NoAutenticado>(cliente.consultarPolizas())
        servidor.enqueue(MockResponse().setResponseCode(403))
        assertIs<ResultadoPoliza.PolizaNoAutorizada>(cliente.consultarPoliza(ID))
        servidor.enqueue(MockResponse().setResponseCode(403))
        assertIs<ResultadoPolizas.NoAutenticado>(cliente.consultarPolizas())
        servidor.enqueue(MockResponse().setResponseCode(403).setBody("no es json"))
        assertIs<ResultadoPolizas.NoAutenticado>(cliente.consultarPolizas())
        servidor.enqueue(MockResponse().setResponseCode(503).setBody("<html>"))
        assertIs<ResultadoPolizas.ServicioNoDisponible>(cliente.consultarPolizas())
        servidor.enqueue(MockResponse().setResponseCode(404).setBody("{}"))
        assertIs<ResultadoPoliza.ErrorDesconocido>(cliente.consultarPoliza(ID))
    }

    @Test
    fun `sin red devuelve SinConexion`() = runTest {
        servidor.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))
        assertIs<ResultadoPolizas.SinConexion>(cliente.consultarPolizas())
        servidor.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AT_START))
        assertIs<ResultadoPoliza.SinConexion>(cliente.consultarPoliza(ID))
    }

    @Test
    fun `JSON invalido en exito es ErrorDesconocido sin crash`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("{no es json"))
        assertIs<ResultadoPolizas.ErrorDesconocido>(cliente.consultarPolizas())
    }

    @Test
    fun `campo obligatorio ausente en exito es ErrorDesconocido`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("""{"numero":"P-1"}"""))
        assertIs<ResultadoPoliza.ErrorDesconocido>(cliente.consultarPoliza(ID))
    }

    @Test
    fun `exito con cuerpo literal null es ErrorDesconocido`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("null"))
        assertIs<ResultadoPoliza.ErrorDesconocido>(cliente.consultarPoliza(ID))
    }

    private companion object {
        const val ID = "7f9c2b1e-0000-4000-8000-000000000001"
    }
}
