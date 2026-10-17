package com.solventa.feature.privacidad.datos

import com.solventa.core.network.ConsentimientosCliente
import com.solventa.core.network.RedModule
import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.Arguments
import org.junit.jupiter.params.provider.MethodSource
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** El repositorio contra un bff-movil simulado en local (MockWebServer), con el cliente HTTP real. */
class RepositorioConsentimientosRedTest {
    private lateinit var servidor: MockWebServer
    private lateinit var repositorio: RepositorioConsentimientosRed

    private val solicitud = SolicitudOtorgamiento(
        permiso = Permiso.OPEN_FINANCE_OPEN_DATA,
        // Elegidos en otro orden: el cuerpo siempre sale en el orden del catálogo.
        alcances = linkedSetOf(Alcance.DA_REGISTROS_PUBLICOS, Alcance.FA_PRODUCTOS_VIGENTES),
        vigenciaMeses = 12,
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
    )

    @BeforeEach
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        val api = RedModule.crearApi(servidor.url("/").toString()) { "token" }
        repositorio = RepositorioConsentimientosRed(ConsentimientosCliente(api))
    }

    @AfterEach
    fun terminar() {
        servidor.shutdown()
    }

    private fun responder(codigo: Int, cuerpo: String, vararg cabeceras: Pair<String, String>) {
        val respuesta = MockResponse().setResponseCode(codigo).setBody(cuerpo)
        cabeceras.forEach { (nombre, valor) -> respuesta.setHeader(nombre, valor) }
        servidor.enqueue(respuesta)
    }

    @Test
    fun `listar traduce estados y fechas UTC, con Z o con desplazamiento`() = runTest {
        responder(
            200,
            "[" + consentimiento(estado = "ACTIVO") + "," +
                consentimiento(estado = "REVOCADO", otorgadoEn = "2026-10-17T15:00:00+00:00", revocadoEn = "\"2026-11-01T10:00:00Z\"") + "," +
                consentimiento(estado = "VENCIDO") + "]",
        )

        val resultado = repositorio.listar()

        assertIs<Resultado.Exito<List<com.solventa.feature.privacidad.dominio.Consentimiento>>>(resultado)
        val (activo, revocado, vencido) = resultado.valor
        assertEquals(EstadoConsentimiento.ACTIVO, activo.estado)
        assertEquals(Instant.parse("2027-10-17T23:59:59Z"), activo.vigenteHasta)
        assertNull(activo.revocadoEn)
        assertEquals(EstadoConsentimiento.REVOCADO, revocado.estado)
        assertEquals(Instant.parse("2026-10-17T15:00:00Z"), revocado.otorgadoEn)
        assertEquals(Instant.parse("2026-11-01T10:00:00Z"), revocado.revocadoEn)
        assertEquals(EstadoConsentimiento.VENCIDO, vencido.estado)
    }

    @Test
    fun `un estado o un alcance nuevos del backend no rompen la lista (N-1)`() = runTest {
        responder(200, "[" + consentimiento(estado = "SUSPENDIDO", alcances = """["FA_PRODUCTOS_VIGENTES","FA_NUEVO"]""") + "]")

        val resultado = repositorio.listar()

        assertIs<Resultado.Exito<List<com.solventa.feature.privacidad.dominio.Consentimiento>>>(resultado)
        assertEquals(EstadoConsentimiento.DESCONOCIDO, resultado.valor.single().estado)
        assertEquals(listOf("FA_PRODUCTOS_VIGENTES", "FA_NUEVO"), resultado.valor.single().alcances)
    }

    @Test
    fun `una fecha ilegible es una respuesta invalida`() = runTest {
        responder(200, "[" + consentimiento(otorgadoEn = "ayer") + "]")

        assertEquals(Resultado.Fallo(FalloConsentimiento.RespuestaInvalida), repositorio.listar())
    }

    @Test
    fun `detalle devuelve el comprobante del consentimiento pedido`() = runTest {
        responder(200, consentimiento())

        val resultado = repositorio.detalle(ID)

        assertIs<Resultado.Exito<com.solventa.feature.privacidad.dominio.Consentimiento>>(resultado)
        assertEquals(ID, resultado.valor.id)
        assertEquals("2026-10-17.1", resultado.valor.versionTexto)
        assertEquals("PERFILAMIENTO_PRECIO", resultado.valor.proposito)
        assertEquals("es-CO", resultado.valor.idioma)
        assertEquals("/v1/consentimientos/$ID", servidor.takeRequest().path)
    }

    @Test
    fun `texto vigente pide el proposito del modulo en el idioma indicado`() = runTest {
        responder(
            200,
            """{"proposito":"PERFILAMIENTO_PRECIO","idioma":"en-US","versionTexto":"2026-10-17.1","titulo":"T","cuerpo":"C","aviso":"A","vigenciasMeses":[6,12],"vigenciaDefectoMeses":12}""",
        )

        val resultado = repositorio.textoVigente("PERFILAMIENTO_PRECIO", "en-US")

        assertIs<Resultado.Exito<com.solventa.feature.privacidad.dominio.TextoVigente>>(resultado)
        assertEquals(listOf(6, 12), resultado.valor.vigenciasMeses)
        assertEquals(12, resultado.valor.vigenciaDefectoMeses)
        assertEquals("en-US", resultado.valor.idioma)
        assertEquals(listOf("T", "C", "A"), listOf(resultado.valor.titulo, resultado.valor.cuerpo, resultado.valor.aviso))
        assertEquals(
            "/v1/consentimientos/texto-vigente?proposito=PERFILAMIENTO_PRECIO&idioma=en-US",
            servidor.takeRequest().path,
        )
    }

    @Test
    fun `otorgar envia el proposito, los alcances en orden estable y la clave del intento`() = runTest {
        responder(201, consentimiento())

        val resultado = repositorio.otorgar(solicitud, "clave-1")

        assertIs<Resultado.Exito<com.solventa.feature.privacidad.dominio.Otorgamiento>>(resultado)
        assertEquals(false, resultado.valor.repeticion)
        val recibida = servidor.takeRequest()
        assertEquals("clave-1", recibida.getHeader("Idempotency-Key"))
        val cuerpo = Json.parseToJsonElement(recibida.body.readUtf8()).jsonObject
        assertEquals("PERFILAMIENTO_PRECIO", cuerpo["proposito"]!!.jsonPrimitive.content)
        assertEquals(
            listOf("FA_PRODUCTOS_VIGENTES", "DA_REGISTROS_PUBLICOS"),
            cuerpo["alcances"]!!.jsonArray.map { it.jsonPrimitive.content },
        )
    }

    @Test
    fun `la repeticion de la misma clave se informa como tal (AC4)`() = runTest {
        responder(200, consentimiento(), "Idempotent-Replayed" to "true")

        val resultado = repositorio.otorgar(solicitud, "clave-1")

        assertIs<Resultado.Exito<com.solventa.feature.privacidad.dominio.Otorgamiento>>(resultado)
        assertTrue(resultado.valor.repeticion)
    }

    @Test
    fun `un otorgamiento con fecha ilegible es una respuesta invalida`() = runTest {
        responder(201, consentimiento(vigenteHasta = "nunca"))

        assertEquals(Resultado.Fallo(FalloConsentimiento.RespuestaInvalida), repositorio.otorgar(solicitud, "c"))
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("errores")
    fun `cada error del contrato se traduce al dominio`(estado: Int, cuerpo: String, esperado: FalloConsentimiento) = runTest {
        responder(estado, cuerpo)

        assertEquals(Resultado.Fallo(esperado), repositorio.otorgar(solicitud, "c"))
    }

    @Test
    fun `sin red las lecturas fallan con SinConexion`() = runTest {
        servidor.shutdown()

        assertEquals(Resultado.Fallo(FalloConsentimiento.SinConexion), repositorio.listar())
        assertEquals(Resultado.Fallo(FalloConsentimiento.SinConexion), repositorio.detalle(ID))
        assertEquals(Resultado.Fallo(FalloConsentimiento.SinConexion), repositorio.textoVigente("P", "es-CO"))
        assertEquals(Resultado.Fallo(FalloConsentimiento.SinConexion), repositorio.otorgar(solicitud, "c"))
    }

    companion object {
        private const val ID = "00000000-0000-4000-9000-000000000001"

        private fun consentimiento(
            estado: String = "ACTIVO",
            alcances: String = """["FA_PRODUCTOS_VIGENTES"]""",
            otorgadoEn: String = "2026-10-17T15:00:00Z",
            vigenteHasta: String = "2027-10-17T23:59:59Z",
            revocadoEn: String = "null",
        ) = """{"consentimientoId":"$ID","estado":"$estado","proposito":"PERFILAMIENTO_PRECIO","alcances":$alcances,"versionTexto":"2026-10-17.1","idioma":"es-CO","otorgadoEn":"$otorgadoEn","vigenteHasta":"$vigenteHasta","revocadoEn":$revocadoEn}"""

        private fun error(codigo: String, detalles: String = "{}") =
            """{"codigo":"$codigo","mensaje":"m","correlationId":"c","detalles":$detalles}"""

        @JvmStatic
        fun errores(): List<Arguments> = listOf(
            Arguments.of(401, error("NO_AUTENTICADO"), FalloConsentimiento.SesionVencida),
            Arguments.of(403, error("ROL_NO_AUTORIZADO"), FalloConsentimiento.NoAutorizado),
            Arguments.of(403, error("IDENTIDAD_NO_VERIFICADA"), FalloConsentimiento.IdentidadNoVerificada),
            Arguments.of(404, error("CLIENTE_NO_ENCONTRADO"), FalloConsentimiento.ClienteNoEncontrado),
            Arguments.of(404, error("CONSENTIMIENTO_NO_ENCONTRADO"), FalloConsentimiento.NoEncontrado),
            Arguments.of(
                409,
                error("CONSENTIMIENTO_YA_VIGENTE", """{"consentimientoId":"vigente-1"}"""),
                FalloConsentimiento.YaVigente("vigente-1"),
            ),
            Arguments.of(
                422,
                error("SOLICITUD_INVALIDA", """{"campos":["vigenciaMeses"]}"""),
                FalloConsentimiento.SolicitudInvalida(listOf("vigenciaMeses")),
            ),
            Arguments.of(422, error("VIGENCIA_INVALIDA"), FalloConsentimiento.VigenciaInvalida),
            Arguments.of(422, error("TEXTO_NO_VIGENTE"), FalloConsentimiento.TextoNoVigente),
            Arguments.of(422, error("IDEMPOTENCIA_CONFLICTO"), FalloConsentimiento.IdempotenciaConflicto),
            Arguments.of(503, error("SERVICIO_NO_DISPONIBLE"), FalloConsentimiento.ServicioNoDisponible),
            Arguments.of(500, error("ERROR_INTERNO"), FalloConsentimiento.RespuestaInvalida),
        )
    }
}
