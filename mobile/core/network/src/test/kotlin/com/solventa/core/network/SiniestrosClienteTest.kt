package com.solventa.core.network

import com.solventa.core.network.modelo.SolicitudFotoEvidenciaDto
import com.solventa.core.network.modelo.SolicitudVideoEvidenciaDto
import com.solventa.core.network.modelo.ActualizacionBorradorDto
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

class SiniestrosClienteTest {
    private lateinit var servidor: MockWebServer
    private lateinit var cliente: SiniestrosCliente
    private val sha = "a".repeat(64)
    private val fecha = "2026-11-17T23:33:00-05:00"

    @Before
    fun preparar() {
        servidor = MockWebServer()
        servidor.start()
        cliente = SiniestrosCliente(RedModule.crearApi(servidor.url("/").toString()) { "token-de-prueba" })
    }

    @After
    fun terminar() {
        servidor.shutdown()
    }

    @Test
    fun `al registrar una foto envia el tipo obligatorio y los metadatos`() = runTest {
        responderRegistro("foto.jpg", "FOTOGRAFIA", "image/jpeg", 123)

        val resultado = cliente.agregarFoto(
            "borrador",
            SolicitudFotoEvidenciaDto("foto.jpg", tipoContenido = "image/jpeg", tamanoBytes = 123, sha256 = sha, capturadaEn = fecha),
        )

        assertIs<ResultadoSiniestros.Exito<*>>(resultado)
        verificarSolicitud(
            """{"nombreArchivo":"foto.jpg","tipo":"FOTOGRAFIA","tipoContenido":"image/jpeg","tamanoBytes":123,"sha256":"$sha","capturadaEn":"$fecha"}""",
        )
    }

    @Test
    fun `al registrar un video envia el tipo obligatorio y la duracion`() = runTest {
        responderRegistro("video.mp4", "VIDEO", "video/mp4", 456, duracion = 12)

        val resultado = cliente.agregarVideo(
            "borrador",
            SolicitudVideoEvidenciaDto(
                "video.mp4",
                tipoContenido = "video/mp4",
                tamanoBytes = 456,
                sha256 = sha,
                capturadaEn = fecha,
                duracionSegundos = 12,
            ),
        )

        assertIs<ResultadoSiniestros.Exito<*>>(resultado)
        verificarSolicitud(
            """{"nombreArchivo":"video.mp4","tipo":"VIDEO","tipoContenido":"video/mp4","tamanoBytes":456,"sha256":"$sha","capturadaEn":"$fecha","duracionSegundos":12}""",
        )
    }

    @Test
    fun `patch guarda causa codigo y fecha con offset separadas de descripcion`() = runTest {
        servidor.enqueue(MockResponse().setBody(borrador()))
        assertIs<ResultadoSiniestros.Exito<*>>(
            cliente.actualizar("borrador", ActualizacionBorradorDto("Choque", "DANOS", fecha)),
        )
        val solicitud = servidor.takeRequest()
        assertEquals("PATCH", solicitud.method)
        assertEquals("/v1/siniestros/borradores/borrador", solicitud.path)
        assertEquals(
            Json.parseToJsonElement("""{"descripcion":"Choque","causa":"DANOS","fechaEvento":"$fecha"}"""),
            Json.parseToJsonElement(solicitud.body.readUtf8()),
        )
    }

    @Test
    fun `envio no lleva formulario ni cliente y repite exactamente la clave`() = runTest {
        val clave = "1ba0a232-831c-4c0c-a5c1-3ae100aa76ac"
        repeat(2) {
            servidor.enqueue(MockResponse().setResponseCode(201).setBody(envio()))
            val resultado = assertIs<ResultadoSiniestros.Exito<*>>(cliente.enviar("borrador", clave))
            assertEquals("88-2026-1000", (resultado.valor as com.solventa.core.network.modelo.EnvioSiniestroDto).codigo)
            val solicitud = servidor.takeRequest()
            assertEquals("POST", solicitud.method)
            assertEquals("/v1/siniestros/borradores/borrador/envio", solicitud.path)
            assertEquals(clave, solicitud.getHeader("Idempotency-Key"))
            assertEquals("Bearer token-de-prueba", solicitud.getHeader("Authorization"))
            assertEquals("", solicitud.body.readUtf8())
        }
    }

    @Test
    fun `recupera borrador convertido y consulta detalle con estado posterior al reporte`() = runTest {
        servidor.enqueue(MockResponse().setBody(borrador("CONVERTIDO", envio())))
        val borrador = assertIs<ResultadoSiniestros.Exito<com.solventa.core.network.modelo.BorradorDetalleDto>>(cliente.detalle("borrador")).valor
        assertEquals("CONVERTIDO", borrador.estado)
        assertEquals("reporte", borrador.envio?.siniestroId)
        servidor.takeRequest()
        servidor.enqueue(MockResponse().setBody(
            """{"siniestroId":"reporte","codigo":"88-2026-1000","estado":"EN_EVALUACION","polizaId":"poliza","reportadoEn":"$fecha","descripcion":"Choque","causa":"DANOS","fechaEvento":"$fecha","evidencias":[],"historial":[]}""",
        ))
        val detalle = assertIs<ResultadoSiniestros.Exito<com.solventa.core.network.modelo.SiniestroDetalleDto>>(cliente.siniestro("reporte")).valor
        assertEquals("EN_EVALUACION", detalle.estado)
        assertEquals("/v1/siniestros/reporte", servidor.takeRequest().path)
    }

    @Test
    fun `pagina historial con cursor y elimina referencia con 204`() = runTest {
        servidor.enqueue(MockResponse().setBody("""{"items":[],"siguienteCursor":"pagina-2"}"""))
        val pagina = assertIs<ResultadoSiniestros.Exito<com.solventa.core.network.modelo.ListadoSiniestrosDto>>(cliente.historial(null)).valor
        assertEquals("pagina-2", pagina.siguienteCursor)
        assertEquals("/v1/siniestros", servidor.takeRequest().path)
        servidor.enqueue(MockResponse().setBody("""{"items":[],"siguienteCursor":null}"""))
        assertNull(assertIs<ResultadoSiniestros.Exito<com.solventa.core.network.modelo.ListadoSiniestrosDto>>(cliente.historial(pagina.siguienteCursor)).valor.siguienteCursor)
        assertEquals("/v1/siniestros?cursor=pagina-2", servidor.takeRequest().path)
        servidor.enqueue(MockResponse().setResponseCode(204))
        assertEquals(ResultadoSiniestros.Exito(Unit), cliente.eliminarEvidencia("borrador", "evidencia"))
        val solicitud = servidor.takeRequest()
        assertEquals("DELETE", solicitud.method)
        assertEquals("/v1/siniestros/borradores/borrador/evidencias/evidencia", solicitud.path)
    }

    @Test
    fun `PATCH ubicacion reemplaza lectura omite estado y distingue objeto de omision`() = runTest {
        val permisos = com.solventa.core.network.modelo.PermisoUbicacionDto.entries
        for (permiso in permisos) {
            val autorizada = permiso.name in listOf("PRECISO", "APROXIMADO")
            val ubicacion = com.solventa.core.network.modelo.UbicacionCapturadaDto(
                permiso, if (autorizada) 4.6 else null, if (autorizada) -74.0 else null,
                if (autorizada) 100.01 else null, if (autorizada) fecha else null,
            )
            servidor.enqueue(MockResponse().setBody(borrador().dropLast(1) + ""","ubicacion":null}"""))
            cliente.actualizar("borrador", ActualizacionBorradorDto(ubicacion = ubicacion))
            val solicitud = servidor.takeRequest()
            assertEquals("PATCH", solicitud.method)
            assertEquals("/v1/siniestros/borradores/borrador", solicitud.path)
            val lectura = if (autorizada) ""","lat":4.6,"lon":-74.0,"precisionM":100.01,"capturadaEn":"$fecha"""" else ""
            assertEquals(
                Json.parseToJsonElement("""{"ubicacion":{"permiso":"${permiso.name}"$lectura}}"""),
                Json.parseToJsonElement(solicitud.body.readUtf8()),
            )
        }
        servidor.enqueue(MockResponse().setBody(borrador()))
        val previo = assertIs<ResultadoSiniestros.Exito<com.solventa.core.network.modelo.BorradorDetalleDto>>(
            cliente.actualizar("borrador", ActualizacionBorradorDto(descripcion = "Correccion")),
        )
        assertNull(previo.valor.ubicacion)
        assertEquals("""{"descripcion":"Correccion"}""", servidor.takeRequest().body.readUtf8())
        servidor.enqueue(MockResponse().setResponseCode(422).setBody(
            """{"codigo":"SOLICITUD_INVALIDA","mensaje":"error","detalles":{"campos":["ubicacion"]}}""",
        ))
        assertEquals(ResultadoSiniestros.Fallo(ErrorSiniestros.UbicacionInvalida), cliente.enviar("borrador", "clave"))
    }

    @Test
    fun `errores de envio no se confunden con exito o fallo de carga S3`() = runTest {
        for ((codigo, esperado) in listOf(
            "POLIZA_NO_VIGENTE" to ErrorSiniestros.PolizaNoVigente,
            "EVIDENCIA_NO_CARGADA" to ErrorSiniestros.EvidenciaNoCargada,
            "BORRADOR_MODIFICADO" to ErrorSiniestros.BorradorModificado,
            "BORRADOR_CONVERTIDO" to ErrorSiniestros.BorradorConvertido,
            "SOLICITUD_INVALIDA" to ErrorSiniestros.SolicitudInvalida,
        )) {
            servidor.enqueue(MockResponse().setResponseCode(if (codigo == "SOLICITUD_INVALIDA") 422 else 409)
                .setBody("""{"codigo":"$codigo","mensaje":"error","correlationId":"c","detalles":{}}"""))
            assertEquals(ResultadoSiniestros.Fallo(esperado), cliente.enviar("borrador", "clave"))
        }
    }

    private fun envio() = """{"borradorId":"borrador","siniestroId":"reporte","codigo":"88-2026-1000","estado":"REPORTADO","reportadoEn":"$fecha"}"""

    private fun borrador(estado: String = "ABIERTO", envio: String = "null") =
        """{"borradorId":"borrador","polizaId":"poliza","descripcion":"Choque","estado":"$estado","creadoEn":"$fecha","cantidadEvidencias":0,"evidenciasPendientes":0,"evidencias":[],"causa":"DANOS","fechaEvento":"$fecha","version":2,"envio":$envio}"""

    private fun responderRegistro(nombre: String, tipo: String, contenido: String, tamano: Int, duracion: Int? = null) {
        servidor.enqueue(
            MockResponse().setResponseCode(201).setBody(
                """{"evidenciaId":"evidencia","nombreArchivo":"$nombre","tipo":"$tipo","tipoContenido":"$contenido","tamanoBytes":$tamano,"sha256":"$sha","capturadaEn":"$fecha","duracionSegundos":$duracion,"estadoCarga":"PENDIENTE","carga":{"metodo":"POST","url":"https://s3.invalid","campos":{},"expiraEn":"$fecha"}}""",
            ),
        )
    }

    private fun verificarSolicitud(cuerpoEsperado: String) {
        val solicitud = servidor.takeRequest(5, TimeUnit.SECONDS) ?: error("No se recibio la solicitud")
        assertEquals("POST", solicitud.method)
        assertEquals("/v1/siniestros/borradores/borrador/evidencias", solicitud.path)
        assertEquals(Json.parseToJsonElement(cuerpoEsperado), Json.parseToJsonElement(solicitud.body.readUtf8()))
    }
}
