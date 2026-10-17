package com.solventa.core.network

import com.solventa.core.network.modelo.SolicitudOtorgarDto
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
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

/** Rutas `/v1/consentimientos` de bff-movil contra un simulador local (HU-M08). */
class ConsentimientosClienteTest {
    private lateinit var servidor: MockWebServer
    private lateinit var cliente: ConsentimientosCliente

    private val clave = "6f1c2b9e-3d4a-4e8f-9b7c-1a2b3c4d5e6f"
    private val solicitud = SolicitudOtorgarDto(
        proposito = "PERFILAMIENTO_PRECIO",
        alcances = listOf("FA_PRODUCTOS_VIGENTES"),
        vigenciaMeses = 12,
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
    )

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        cliente = ConsentimientosCliente(RedModule.crearApi(servidor.url("/").toString()) { "token-de-prueba" })
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    private fun responder(codigo: Int, cuerpo: String, vararg cabeceras: Pair<String, String>) {
        val respuesta = MockResponse().setResponseCode(codigo).setBody(cuerpo)
        cabeceras.forEach { (nombre, valor) -> respuesta.setHeader(nombre, valor) }
        servidor.enqueue(respuesta)
    }

    private fun error(codigo: String, detalles: String = "{}") =
        """{"codigo":"$codigo","mensaje":"Mensaje del servidor","correlationId":"c","detalles":$detalles}"""

    // --- Otorgar ---------------------------------------------------------------------------

    @Test
    fun `otorgar envia la clave de idempotencia, el token y el cuerpo del contrato`() = runTest {
        responder(201, CONSENTIMIENTO)

        val resultado = cliente.otorgar(clave, solicitud)

        assertIs<ResultadoConsentimiento.Exito<*>>(resultado)
        assertFalse(resultado.repeticion)
        val recibida = servidor.takeRequest()
        assertEquals("POST", recibida.method)
        assertEquals("/v1/consentimientos", recibida.path)
        assertEquals(clave, recibida.getHeader("Idempotency-Key"))
        assertEquals("Bearer token-de-prueba", recibida.getHeader("Authorization"))
        val cuerpo = Json.parseToJsonElement(recibida.body.readUtf8()).jsonObject
        assertEquals(setOf("proposito", "alcances", "vigenciaMeses", "versionTexto", "idioma"), cuerpo.keys)
        assertEquals(12, cuerpo["vigenciaMeses"]!!.jsonPrimitive.int)
        assertEquals("FA_PRODUCTOS_VIGENTES", cuerpo["alcances"]!!.jsonArray.single().jsonPrimitive.content)
        // El titular sale del token: la app nunca envía un clienteId.
        assertFalse(cuerpo.containsKey("clienteId"))
    }

    @Test
    fun `otorgar lee el consentimiento creado con sus fechas en UTC tal como llegan`() = runTest {
        responder(201, CONSENTIMIENTO)

        val resultado = cliente.otorgar(clave, solicitud)

        assertIs<ResultadoConsentimiento.Exito<*>>(resultado)
        val dto = resultado.valor as com.solventa.core.network.modelo.ConsentimientoDto
        assertEquals("00000000-0000-4000-9000-000000000001", dto.consentimientoId)
        assertEquals("ACTIVO", dto.estado)
        assertEquals("2027-10-17T23:59:59Z", dto.vigenteHasta)
        assertNull(dto.revocadoEn)
    }

    @Test
    fun `200 con Idempotent-Replayed es la repeticion de la misma clave (AC4)`() = runTest {
        responder(200, CONSENTIMIENTO, "Idempotent-Replayed" to "true")

        val resultado = cliente.otorgar(clave, solicitud)

        assertIs<ResultadoConsentimiento.Exito<*>>(resultado)
        assertTrue(resultado.repeticion)
    }

    @Test
    fun `409 CONSENTIMIENTO_YA_VIGENTE trae el identificador del vigente`() = runTest {
        responder(409, error("CONSENTIMIENTO_YA_VIGENTE", """{"consentimientoId":"id-vigente"}"""))

        val resultado = cliente.otorgar(clave, solicitud)

        assertEquals(
            ResultadoConsentimiento.Fallo(ErrorConsentimiento.ConsentimientoYaVigente("id-vigente")),
            resultado,
        )
    }

    @Test
    fun `409 sin detalles no rompe la lectura`() = runTest {
        responder(409, error("CONSENTIMIENTO_YA_VIGENTE"))

        val resultado = cliente.otorgar(clave, solicitud)

        assertEquals(ResultadoConsentimiento.Fallo(ErrorConsentimiento.ConsentimientoYaVigente(null)), resultado)
    }

    @Test
    fun `422 SOLICITUD_INVALIDA conserva solo las rutas de campos (AC3)`() = runTest {
        responder(422, error("SOLICITUD_INVALIDA", """{"campos":["proposito","vigenciaMeses",3,{"x":1}]}"""))

        val resultado = cliente.otorgar(clave, solicitud)

        assertEquals(
            ResultadoConsentimiento.Fallo(ErrorConsentimiento.SolicitudInvalida(listOf("proposito", "vigenciaMeses"))),
            resultado,
        )
    }

    @Test
    fun `422 SOLICITUD_INVALIDA sin campos es una lista vacia`() = runTest {
        responder(422, error("SOLICITUD_INVALIDA"))

        assertEquals(
            ResultadoConsentimiento.Fallo(ErrorConsentimiento.SolicitudInvalida(emptyList())),
            cliente.otorgar(clave, solicitud),
        )
    }

    @Test
    fun `cada codigo del contrato se traduce por codigo, no por estado HTTP`() = runTest {
        val casos = listOf(
            Triple(401, "NO_AUTENTICADO", ErrorConsentimiento.NoAutenticado),
            Triple(403, "ROL_NO_AUTORIZADO", ErrorConsentimiento.RolNoAutorizado),
            Triple(403, "IDENTIDAD_NO_VERIFICADA", ErrorConsentimiento.IdentidadNoVerificada),
            Triple(404, "CLIENTE_NO_ENCONTRADO", ErrorConsentimiento.ClienteNoEncontrado),
            Triple(404, "CONSENTIMIENTO_NO_ENCONTRADO", ErrorConsentimiento.ConsentimientoNoEncontrado),
            Triple(422, "VIGENCIA_INVALIDA", ErrorConsentimiento.VigenciaInvalida),
            Triple(422, "TEXTO_NO_VIGENTE", ErrorConsentimiento.TextoNoVigente),
            Triple(422, "IDEMPOTENCIA_CONFLICTO", ErrorConsentimiento.IdempotenciaConflicto),
            Triple(503, "SERVICIO_NO_DISPONIBLE", ErrorConsentimiento.ServicioNoDisponible),
        )
        for ((estado, codigo, esperado) in casos) {
            responder(estado, error(codigo))
            assertEquals(ResultadoConsentimiento.Fallo(esperado), cliente.otorgar(clave, solicitud), codigo)
        }
    }

    @Test
    fun `sin cuerpo de error se decide por estado HTTP`() = runTest {
        val casos = listOf(
            401 to ErrorConsentimiento.NoAutenticado,
            502 to ErrorConsentimiento.ServicioNoDisponible,
            503 to ErrorConsentimiento.ServicioNoDisponible,
            504 to ErrorConsentimiento.ServicioNoDisponible,
            500 to ErrorConsentimiento.Desconocido(500),
            418 to ErrorConsentimiento.Desconocido(418),
        )
        for ((estado, esperado) in casos) {
            responder(estado, "<html>gateway</html>")
            assertEquals(ResultadoConsentimiento.Fallo(esperado), cliente.otorgar(clave, solicitud), "$estado")
        }
    }

    @Test
    fun `un codigo desconocido es Desconocido con su estado`() = runTest {
        responder(422, error("CODIGO_NUEVO_DE_N_MAS_1"))

        assertEquals(ResultadoConsentimiento.Fallo(ErrorConsentimiento.Desconocido(422)), cliente.otorgar(clave, solicitud))
    }

    @Test
    fun `sin red el resultado es SinConexion`() = runTest {
        servidor.shutdown()

        assertEquals(ResultadoConsentimiento.Fallo(ErrorConsentimiento.SinConexion), cliente.otorgar(clave, solicitud))
    }

    @Test
    fun `si el servidor corta la conexion el resultado es SinConexion`() = runTest {
        servidor.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))

        assertEquals(ResultadoConsentimiento.Fallo(ErrorConsentimiento.SinConexion), cliente.otorgar(clave, solicitud))
    }

    @Test
    fun `un cuerpo de exito fuera del contrato es Desconocido`() = runTest {
        responder(201, """{"consentimientoId":"x"}""")

        assertEquals(ResultadoConsentimiento.Fallo(ErrorConsentimiento.Desconocido(null)), cliente.otorgar(clave, solicitud))
    }

    // --- Lista, detalle y texto -------------------------------------------------------------

    @Test
    fun `listar lee un arreglo simple y tolera campos nuevos`() = runTest {
        val conCampoNuevo = CONSENTIMIENTO.replace("\"revocadoEn\":null", "\"revocadoEn\":null,\"campoNuevo\":1")
        responder(200, "[$conCampoNuevo]")

        val resultado = cliente.listar()

        assertIs<ResultadoConsentimiento.Exito<List<*>>>(resultado)
        assertEquals(1, resultado.valor.size)
        val recibida = servidor.takeRequest()
        assertEquals("GET", recibida.method)
        assertEquals("/v1/consentimientos", recibida.path)
    }

    @Test
    fun `listar vacio es Exito con lista vacia`() = runTest {
        responder(200, "[]")

        val resultado = cliente.listar()

        assertIs<ResultadoConsentimiento.Exito<List<*>>>(resultado)
        assertTrue(resultado.valor.isEmpty())
    }

    @Test
    fun `detalle usa el consentimientoId en la ruta`() = runTest {
        responder(200, CONSENTIMIENTO)

        val resultado = cliente.detalle("00000000-0000-4000-9000-000000000001")

        assertIs<ResultadoConsentimiento.Exito<*>>(resultado)
        assertEquals("/v1/consentimientos/00000000-0000-4000-9000-000000000001", servidor.takeRequest().path)
    }

    @Test
    fun `detalle ajeno o inexistente es ConsentimientoNoEncontrado`() = runTest {
        responder(404, error("CONSENTIMIENTO_NO_ENCONTRADO"))

        assertEquals(
            ResultadoConsentimiento.Fallo(ErrorConsentimiento.ConsentimientoNoEncontrado),
            cliente.detalle("otro"),
        )
    }

    @Test
    fun `texto vigente envia proposito e idioma y lee las vigencias permitidas`() = runTest {
        responder(200, TEXTO)

        val resultado = cliente.textoVigente("PERFILAMIENTO_PRECIO", "en-US")

        assertIs<ResultadoConsentimiento.Exito<*>>(resultado)
        val texto = resultado.valor as com.solventa.core.network.modelo.TextoVigenteDto
        assertEquals(listOf(6, 12), texto.vigenciasMeses)
        assertEquals(12, texto.vigenciaDefectoMeses)
        assertEquals(
            "/v1/consentimientos/texto-vigente?proposito=PERFILAMIENTO_PRECIO&idioma=en-US",
            servidor.takeRequest().path,
        )
    }

    private companion object {
        const val CONSENTIMIENTO = """{"consentimientoId":"00000000-0000-4000-9000-000000000001","estado":"ACTIVO","proposito":"PERFILAMIENTO_PRECIO","alcances":["FA_PRODUCTOS_VIGENTES"],"versionTexto":"2026-10-17.1","idioma":"es-CO","otorgadoEn":"2026-10-17T15:00:00Z","vigenteHasta":"2027-10-17T23:59:59Z","revocadoEn":null}"""
        const val TEXTO = """{"proposito":"PERFILAMIENTO_PRECIO","idioma":"en-US","versionTexto":"2026-10-17.1","titulo":"Sample authorization","cuerpo":"Illustrative text.","aviso":"No legal validity","vigenciasMeses":[6,12],"vigenciaDefectoMeses":12}"""
    }
}
