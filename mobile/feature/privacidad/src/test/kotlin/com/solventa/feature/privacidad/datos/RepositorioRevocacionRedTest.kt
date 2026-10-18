package com.solventa.feature.privacidad.datos

import com.solventa.core.network.ConsentimientosCliente
import com.solventa.core.network.RedModule
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Hito
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.TipoHito
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

/** Revocar e historial (HU-M09) contra un bff-movil simulado en local, con el cliente HTTP real. */
class RepositorioRevocacionRedTest {
    private lateinit var servidor: MockWebServer
    private lateinit var repositorio: RepositorioConsentimientosRed

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

    private fun responder(codigo: Int, cuerpo: String) {
        servidor.enqueue(MockResponse().setResponseCode(codigo).setBody(cuerpo))
    }

    @Test
    fun `revocar devuelve el consentimiento revocado con su fecha en UTC`() = runTest {
        responder(200, consentimiento("REVOCADO", "\"2026-11-02T03:15:00-05:00\""))

        val resultado = repositorio.revocar(ID)

        assertIs<Resultado.Exito<Consentimiento>>(resultado)
        assertEquals(EstadoConsentimiento.REVOCADO, resultado.valor.estado)
        assertEquals(Instant.parse("2026-11-02T08:15:00Z"), resultado.valor.revocadoEn)
        val recibida = servidor.takeRequest()
        assertEquals("POST", recibida.method)
        assertEquals("/v1/consentimientos/$ID/revocacion", recibida.path)
    }

    @Test
    fun `revocar un vencido devuelve VENCIDO sin fecha de revocacion, sin reinterpretarlo`() = runTest {
        responder(200, consentimiento("VENCIDO", "null"))

        val resultado = repositorio.revocar(ID)

        assertIs<Resultado.Exito<Consentimiento>>(resultado)
        assertEquals(EstadoConsentimiento.VENCIDO, resultado.valor.estado)
        assertNull(resultado.valor.revocadoEn)
    }

    @Test
    fun `revocar traduce 404 y 503 por codigo`() = runTest {
        responder(404, error("CONSENTIMIENTO_NO_ENCONTRADO"))
        responder(503, error("SERVICIO_NO_DISPONIBLE"))

        assertEquals(Resultado.Fallo(FalloConsentimiento.NoEncontrado), repositorio.revocar("ajeno"))
        assertEquals(Resultado.Fallo(FalloConsentimiento.ServicioNoDisponible), repositorio.revocar(ID))
    }

    @Test
    fun `historial traduce los hitos en orden con instantes UTC`() = runTest {
        responder(
            200,
            """{"consentimientoId":"$ID","estado":"REVOCADO","hitos":[""" +
                """{"tipo":"OTORGADO","ocurridoEn":"2026-10-17T15:00:00Z"},""" +
                """{"tipo":"REVOCADO","ocurridoEn":"2026-11-02T08:15:00+00:00"}]}""",
        )

        assertEquals(
            Resultado.Exito(
                Historial(
                    ID,
                    EstadoConsentimiento.REVOCADO,
                    listOf(
                        Hito(TipoHito.OTORGADO, Instant.parse("2026-10-17T15:00:00Z")),
                        Hito(TipoHito.REVOCADO, Instant.parse("2026-11-02T08:15:00Z")),
                    ),
                ),
            ),
            repositorio.historial(ID),
        )
        assertEquals("/v1/consentimientos/$ID/historial", servidor.takeRequest().path)
    }

    @Test
    fun `un tipo de hito o un estado nuevos quedan DESCONOCIDO, no se pierden (N-1)`() = runTest {
        responder(
            200,
            """{"consentimientoId":"$ID","estado":"SUSPENDIDO","hitos":[{"tipo":"SUSPENDIDO","ocurridoEn":"2026-11-03T00:00:00Z"}]}""",
        )

        val resultado = repositorio.historial(ID)

        assertIs<Resultado.Exito<Historial>>(resultado)
        assertEquals(EstadoConsentimiento.DESCONOCIDO, resultado.valor.estado)
        assertEquals(listOf(TipoHito.DESCONOCIDO), resultado.valor.hitos.map { it.tipo })
    }

    @Test
    fun `un historial vacio es valido`() = runTest {
        responder(200, """{"consentimientoId":"$ID","estado":"ACTIVO","hitos":[]}""")

        assertEquals(Resultado.Exito(Historial(ID, EstadoConsentimiento.ACTIVO, emptyList())), repositorio.historial(ID))
    }

    @Test
    fun `una fecha de hito ilegible es una respuesta invalida`() = runTest {
        responder(200, """{"consentimientoId":"$ID","estado":"ACTIVO","hitos":[{"tipo":"OTORGADO","ocurridoEn":"ayer"}]}""")

        assertEquals(Resultado.Fallo(FalloConsentimiento.RespuestaInvalida), repositorio.historial(ID))
    }

    @Test
    fun `historial ajeno es NoEncontrado`() = runTest {
        responder(404, error("CONSENTIMIENTO_NO_ENCONTRADO"))

        assertEquals(Resultado.Fallo(FalloConsentimiento.NoEncontrado), repositorio.historial("ajeno"))
    }

    private companion object {
        const val ID = "00000000-0000-4000-9000-000000000001"

        fun consentimiento(estado: String, revocadoEn: String) =
            """{"consentimientoId":"$ID","estado":"$estado","proposito":"PERFILAMIENTO_PRECIO","alcances":["FA_PRODUCTOS_VIGENTES"],"versionTexto":"2026-10-17.1","idioma":"es-CO","otorgadoEn":"2026-10-17T15:00:00Z","vigenteHasta":"2027-10-17T23:59:59Z","revocadoEn":$revocadoEn}"""

        fun error(codigo: String) = """{"codigo":"$codigo","mensaje":"m","correlationId":"c","detalles":{}}"""
    }
}
