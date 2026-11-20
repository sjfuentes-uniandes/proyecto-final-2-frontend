package com.solventa.feature.siniestros.datos

import com.solventa.core.network.RedModule
import com.solventa.core.network.SiniestrosCliente
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.ArchivoEvidencia
import com.solventa.core.network.modelo.EnlaceEvidenciaDto
import java.io.File
import java.time.OffsetDateTime
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DescargaEvidenciasTest {
    @TempDir
    lateinit var directorio: File
    private lateinit var bff: MockWebServer
    private lateinit var s3: MockWebServer
    private lateinit var repositorio: RepositorioSiniestrosRed
    private val ahora = OffsetDateTime.parse("2026-11-18T21:00:00Z")

    @BeforeEach
    fun preparar() {
        bff = MockWebServer().apply { start() }
        s3 = MockWebServer().apply { start() }
        repositorio = RepositorioSiniestrosRed(
            SiniestrosCliente(RedModule.crearApi(bff.url("/").toString()) { "token-de-prueba" }),
            CargaS3(),
            DescargaEvidencias.paraPruebas(OkHttpClient.Builder().retryOnConnectionFailure(false).build()) { ahora },
        )
    }

    @AfterEach
    fun cerrar() {
        bff.shutdown()
        s3.shutdown()
    }

    @Test
    fun `descarga imagen y documento con nombre MIME y query intactos sin enviar token a S3`() = runBlocking {
        for ((nombre, mime) in listOf("foto.jpg" to "image/jpeg", "informe.pdf" to "application/pdf")) {
            val ruta = "/objeto?X-Amz-Signature=abc%2Fdef&X-Amz-Security-Token=token%2Bfirmado"
            enlace(ruta, nombre = nombre, mime = mime)
            s3.enqueue(MockResponse().setBody("contenido de $nombre"))

            val archivo = assertIs<Resultado.Exito<ArchivoEvidencia>>(
                repositorio.descargarEvidencia("siniestro", "evidencia", directorio),
            ).valor

            assertEquals(nombre, archivo.nombreArchivo)
            assertEquals(nombre, archivo.archivo.name)
            assertEquals(mime, archivo.tipoContenido)
            assertEquals("contenido de $nombre", archivo.archivo.readText())
            val solicitudBff = bff.takeRequest()
            assertEquals("POST", solicitudBff.method)
            assertEquals("/v1/siniestros/siniestro/evidencias/evidencia/enlace", solicitudBff.path)
            assertEquals(0, solicitudBff.bodySize)
            assertEquals("Bearer token-de-prueba", solicitudBff.getHeader("Authorization"))
            val solicitudS3 = s3.takeRequest()
            assertEquals("GET", solicitudS3.method)
            assertEquals(ruta, solicitudS3.path)
            assertNull(solicitudS3.getHeader("Authorization"))
            assertNull(solicitudS3.getHeader("Cookie"))
        }
    }

    @Test
    fun `firma rechazada renueva una vez y no reintenta indefinidamente`() = runBlocking {
        enlace("/primero")
        enlace("/segundo")
        s3.enqueue(MockResponse().setResponseCode(403).setBody("<Error>ExpiredToken</Error>"))
        s3.enqueue(MockResponse().setResponseCode(403).setBody("<Error>AccessDenied</Error>"))

        assertEquals(
            Resultado.Fallo(FalloSiniestros.DescargaFallida),
            repositorio.descargarEvidencia("siniestro", "evidencia", directorio),
        )
        assertEquals(2, bff.requestCount)
        assertEquals(2, s3.requestCount)
        assertTrue(directorio.listFiles().orEmpty().isEmpty())
    }

    @Test
    fun `enlace ya vencido se reemplaza antes del GET y permite recuperar descarga`() = runBlocking {
        enlace("/vencido", expiraEn = ahora.minusSeconds(1).toString())
        enlace("/nuevo")
        s3.enqueue(MockResponse().setBody("foto"))

        assertIs<Resultado.Exito<*>>(repositorio.descargarEvidencia("siniestro", "evidencia", directorio))
        assertEquals(2, bff.requestCount)
        assertEquals(1, s3.requestCount)
        assertEquals("/nuevo", s3.takeRequest().path)
    }

    @Test
    fun `errores BFF se informan sin intentar abrir ni descargar de S3`() = runBlocking {
        val errores = listOf(
            Triple(401, "NO_AUTENTICADO", FalloSiniestros.SesionVencida),
            Triple(403, "ROL_NO_AUTORIZADO", FalloSiniestros.NoAutorizado),
            Triple(404, "EVIDENCIA_NO_ENCONTRADA", FalloSiniestros.EvidenciaNoDisponible),
            Triple(404, "SINIESTRO_NO_ENCONTRADO", FalloSiniestros.EvidenciaNoDisponible),
            Triple(409, "EVIDENCIA_NO_CARGADA", FalloSiniestros.EvidenciaNoCargada),
            Triple(422, "INTEGRIDAD_EVIDENCIA_INVALIDA", FalloSiniestros.IntegridadEvidenciaInvalida),
            Triple(503, "SERVICIO_NO_DISPONIBLE", FalloSiniestros.ServicioNoDisponible),
        )
        for ((estado, codigo, esperado) in errores) {
            bff.enqueue(MockResponse().setResponseCode(estado).setBody("""{"codigo":"$codigo","mensaje":"Error"}"""))
            assertEquals(Resultado.Fallo(esperado), repositorio.descargarEvidencia("siniestro", "evidencia", directorio))
        }
        assertEquals(0, s3.requestCount)
        assertTrue(directorio.listFiles().orEmpty().isEmpty())
    }

    @Test
    fun `404 y fallo temporal de S3 no se interpretan como JSON BFF y se pueden reintentar`() = runBlocking {
        for ((estado, fallo) in listOf(404 to FalloSiniestros.EvidenciaNoDisponible, 503 to FalloSiniestros.DescargaFallida)) {
            enlace("/archivo")
            s3.enqueue(MockResponse().setResponseCode(estado).setBody("<Error>Indisponible</Error>"))
            assertEquals(Resultado.Fallo(fallo), repositorio.descargarEvidencia("siniestro", "evidencia", directorio))
        }
        enlace("/archivo")
        s3.enqueue(MockResponse().setBody("recuperada"))
        assertIs<Resultado.Exito<*>>(repositorio.descargarEvidencia("siniestro", "evidencia", directorio))
        assertEquals(3, s3.requestCount)
    }

    @Test
    fun `cliente de produccion rechaza enlaces sin HTTPS`() = runBlocking {
        val enlace = EnlaceEvidenciaDto(s3.url("/archivo").toString(), ahora.plusYears(10).toString(), "foto.jpg", "image/jpeg")
        val resultado = DescargaEvidencias().descargar(directorio) { Resultado.Exito(enlace) }

        assertEquals(Resultado.Fallo(FalloSiniestros.RespuestaInvalida), resultado)
        assertEquals(0, s3.requestCount)
    }

    private fun enlace(
        ruta: String,
        expiraEn: String = ahora.plusSeconds(60).toString(),
        nombre: String = "foto.jpg",
        mime: String = "image/jpeg",
    ) {
        bff.enqueue(
            MockResponse().setHeader("Content-Type", "application/json").setBody(
                """{"url":"${s3.url(ruta)}","expiraEn":"$expiraEn","nombreArchivo":"$nombre","tipoContenido":"$mime"}""",
            ),
        )
    }
}
