package com.solventa.core.network

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

/**
 * Compatibilidad N-1: un backend más nuevo puede añadir campos a `PolizaResumenDto`, `PolizaDetalleDto`
 * y `ErrorDto` (en cualquier nivel y de cualquier tipo) sin romper la app ya instalada.
 */
class BffMovilClienteCompatibilidadTest {
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

    // Campos nuevos de todos los tipos JSON: texto, número, booleano, null, objeto y arreglo.
    private val extras = """"nuevoTexto":"x","nuevoNumero":7,"nuevoBool":true,"nuevoNulo":null,""" +
        """"nuevoObjeto":{"a":{"b":[1,2]}},"nuevoArreglo":[{"k":1},"s",3]"""

    private val resumenConExtras = """{"polizaId":"$ID","numero":"P-1","estado":"ACTIVA","producto":"Auto","ramo":"Vehículos",""" +
        """"vigencia":{"desde":"2026-01-01","hasta":"2027-01-01",$extras},"vigente":true,""" +
        """"resumenCobertura":{"sumaAsegurada":"300000000.00","moneda":"COP","totalCoberturas":3,$extras},$extras}"""

    private val detalleConExtras = """{"numero":"P-1","estado":"ACTIVA","producto":"Auto","ramo":"Vehículos",""" +
        """"vigencia":{"desde":"2026-01-01","hasta":"2027-01-01",$extras},"vigente":true,"prima":"1200000.50",""" +
        """"sumaAsegurada":"300000000.00","moneda":"COP","periodicidad":"MENSUAL","emitidaEn":"2026-01-01T10:00:00Z",""" +
        """"coberturas":[{"codigo":"RC","nombre":"Responsabilidad civil","obligatoria":true,$extras}],""" +
        """"credencial":{"numero":"C-1","huella":"abcdef0123456789","firmaId":"f-1",""" +
        """"vigencia":{"desde":"2026-01-01","hasta":"2027-01-01",$extras},$extras},$extras}"""

    private fun errorConExtras(estado: Int, codigo: String) = servidor.enqueue(
        MockResponse().setResponseCode(estado).setBody(
            """{"codigo":"$codigo","mensaje":"m","correlationId":"c-1","detalles":{"campo":"x",$extras},$extras}""",
        ),
    )

    @Test
    fun `PolizaResumenDto tolera campos adicionales en todos los niveles`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody("[$resumenConExtras]"))

        val resultado = cliente.consultarPolizas()

        assertIs<ResultadoPolizas.Exito>(resultado)
        val poliza = resultado.polizas.single()
        assertEquals(ID, poliza.polizaId)
        assertEquals("2027-01-01", poliza.vigencia.hasta)
        assertEquals(3, poliza.resumenCobertura.totalCoberturas)
    }

    @Test
    fun `PolizaDetalleDto tolera campos adicionales en todos los niveles`() = runTest {
        servidor.enqueue(MockResponse().setResponseCode(200).setBody(detalleConExtras))

        val resultado = cliente.consultarPoliza(ID)

        assertIs<ResultadoPoliza.Exito>(resultado)
        assertEquals("P-1", resultado.poliza.numero)
        assertEquals("RC", resultado.poliza.coberturas.single().codigo)
        assertEquals("C-1", resultado.poliza.credencial.numero)
        assertEquals("2027-01-01", resultado.poliza.credencial.vigencia.hasta)
    }

    @Test
    fun `un estado nuevo en la poliza no rompe la lectura`() = runTest {
        servidor.enqueue(
            MockResponse().setResponseCode(200).setBody("[${resumenConExtras.replace("\"ACTIVA\"", "\"SUSPENDIDA\"")}]"),
        )

        val resultado = cliente.consultarPolizas()

        assertIs<ResultadoPolizas.Exito>(resultado)
        assertEquals("SUSPENDIDA", resultado.polizas.single().estado)
    }

    @Test
    fun `ErrorDto con campos adicionales se sigue traduciendo por codigo`() = runTest {
        errorConExtras(401, "NO_AUTENTICADO")
        assertIs<ResultadoPolizas.NoAutenticado>(cliente.consultarPolizas())

        errorConExtras(403, "POLIZA_NO_AUTORIZADA")
        assertIs<ResultadoPoliza.PolizaNoAutorizada>(cliente.consultarPoliza(ID))

        errorConExtras(404, "POLIZA_NO_ENCONTRADA")
        assertIs<ResultadoPoliza.PolizaNoEncontrada>(cliente.consultarPoliza(ID))

        errorConExtras(404, "CLIENTE_NO_ENCONTRADO")
        assertIs<ResultadoPolizas.ClienteNoEncontrado>(cliente.consultarPolizas())

        errorConExtras(503, "SERVICIO_NO_DISPONIBLE")
        assertIs<ResultadoPolizas.ServicioNoDisponible>(cliente.consultarPolizas())
    }

    @Test
    fun `un codigo de error nuevo cae al estado HTTP sin romper`() = runTest {
        errorConExtras(503, "CODIGO_FUTURO")
        assertIs<ResultadoPolizas.ServicioNoDisponible>(cliente.consultarPolizas())

        errorConExtras(500, "CODIGO_FUTURO")
        assertIs<ResultadoPolizas.ErrorDesconocido>(cliente.consultarPolizas())
    }

    private companion object {
        const val ID = "7f9c2b1e-0000-4000-8000-000000000001"
    }
}
