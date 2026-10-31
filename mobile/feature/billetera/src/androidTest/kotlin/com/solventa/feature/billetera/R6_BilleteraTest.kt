package com.solventa.feature.billetera

import android.content.Context
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solventa.core.auth.AlmacenSesionSegura
import com.solventa.core.auth.ClienteIdentidad
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.RedModule
import com.solventa.feature.billetera.datos.RepositorioPolizasRed
import com.solventa.feature.billetera.ui.BilleteraRoute
import com.solventa.feature.billetera.ui.DetallePolizaRoute
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.net.InetAddress
import java.util.Locale
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

private const val ESPERA_MS = 10_000L
private const val FUENTE_200 = 2f
private const val ID_ACTIVA = "id-activa"
private const val ID_VENCIDA = "id-vencida"
private const val ETIQUETA_LOGIN = "r6.login"

/**
 * Riesgo R6 (Estrategia de Pruebas v2): consulta de póliza, tramo EN LÍNEA de HU-M10. Recorre la
 * app real (Route + ViewModel + repositorio + cliente HTTP) contra un MockWebServer, en es-CO y en-US.
 */
@RunWith(Parameterized::class)
class R6_BilleteraTest(private val etiquetaIdioma: String) {
    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun idiomas() = listOf("es-CO", "en-US")
    }

    @get:Rule
    val compose = createAndroidComposeRule<ComponentActivity>()

    private val idioma: Locale = Locale.forLanguageTag(etiquetaIdioma)
    private lateinit var servidor: MockWebServer
    private var puerto = 0
    private lateinit var repositorio: RepositorioPolizasRed
    private lateinit var almacen: AlmacenEspia
    private lateinit var gestor: GestorSesion

    private val textos: Context by lazy {
        val base = compose.activity
        base.createConfigurationContext(Configuration(base.resources.configuration).apply { setLocale(idioma) })
    }

    private fun texto(id: Int) = textos.getString(id)

    @Before
    fun preparar() {
        servidor = MockWebServer().also { it.start(InetAddress.getByName("localhost"), 0) }
        puerto = servidor.port
        repositorio = RepositorioPolizasRed(
            BffMovilCliente(RedModule.crearApi("http://localhost:$puerto/") { "token-de-prueba" }),
        )
        almacen = AlmacenEspia()
        gestor = GestorSesion(ClienteIdentidadInerte, almacen)
    }

    @After
    fun terminar() {
        runCatching { servidor.shutdown() }
    }

    // --- Casos de R6 -------------------------------------------------------------------------

    @Test
    fun R6_caso_feliz() {
        servidor.enqueue(json(200, "[${resumen(ID_ACTIVA, "POL-000123", "Seguro de Vida", true, 3)}," +
            "${resumen(ID_VENCIDA, "POL-000099", "Seguro de Auto", false, 1)}]"))
        servidor.enqueue(json(200, detalle()))

        montar()
        esperarEtiqueta(EtiquetasPrueba.poliza(ID_ACTIVA))

        compose.onNodeWithText("Seguro de Vida").assertIsDisplayed()
        compose.onNodeWithText("Seguro de Auto").assertIsDisplayed()
        compose.onNodeWithText(texto(R.string.billetera_estado_activa), useUnmergedTree = true).assertIsDisplayed()
        compose.onNodeWithText(texto(R.string.billetera_estado_vencida), useUnmergedTree = true).assertIsDisplayed()

        compose.onNodeWithTag(EtiquetasPrueba.poliza(ID_ACTIVA)).performClick()
        esperarEtiqueta(EtiquetasPrueba.DETALLE)

        compose.onNodeWithText(textos.getString(R.string.detalle_vigencia_inicio, "1/1/2026".fechaLarga())).assertExists()
        compose.onNodeWithText(textos.getString(R.string.detalle_vigencia_fin, "31/12/2026".fechaLarga())).assertExists()
        compose.onNodeWithText("Muerte por cualquier causa").assertExists()
        compose.onNodeWithText("Incapacidad total y permanente").assertExists()
        compose.onNodeWithText(textos.getString(R.string.detalle_credencial_numero, "CRED-0001-2026")).assertExists()
        compose.onNodeWithText(textos.getString(R.string.detalle_credencial_huella, "a1b2c3d4")).assertExists()
        compose.onAllNodesWithText("a1b2c3d4e5", substring = true).assertCountEquals(0)

        val lista = servidor.takeRequest()
        assertEquals("/v1/polizas", lista.path)
        assertNotNull(lista.getHeader("Authorization"))
        assertTrue(lista.requestUrl!!.queryParameterNames.isEmpty(), "La app no envía clienteId")
        val detalle = servidor.takeRequest()
        assertEquals("/v1/polizas/$ID_ACTIVA", detalle.path)
        assertTrue(detalle.requestUrl!!.queryParameterNames.isEmpty())
    }

    @Test
    fun R6_fallo_servicio_caido() {
        servidor.enqueue(error(503, "SERVICIO_NO_DISPONIBLE"))
        servidor.enqueue(json(200, "[${resumen(ID_ACTIVA, "POL-000123", "Seguro de Vida", true, 3)}]"))

        montar()
        esperarTexto(texto(R.string.billetera_error_generico))
        compose.onNodeWithText(texto(R.string.billetera_reintentar)).performClick()

        esperarEtiqueta(EtiquetasPrueba.poliza(ID_ACTIVA))
        compose.onNodeWithText("Seguro de Vida").assertIsDisplayed()
        assertEquals(2, servidor.requestCount)
    }

    @Test
    fun R6_fallo_sin_conexion() {
        servidor.shutdown()

        montar()
        esperarTexto(texto(R.string.billetera_error_sin_conexion))

        servidor = reiniciarEnElMismoPuerto()
        servidor.enqueue(json(200, "[${resumen(ID_ACTIVA, "POL-000123", "Seguro de Vida", true, 3)}]"))
        compose.onNodeWithText(texto(R.string.billetera_reintentar)).performClick()

        esperarEtiqueta(EtiquetasPrueba.poliza(ID_ACTIVA))
        compose.onNodeWithText("Seguro de Vida").assertIsDisplayed()
    }

    @Test
    fun R6_poliza_ajena_403() {
        servidor.enqueue(json(200, "[${resumen(ID_ACTIVA, "POL-000123", "Seguro de Vida", true, 3)}]"))
        servidor.enqueue(error(403, "POLIZA_NO_AUTORIZADA", "La póliza POL-000777 es de otro cliente"))

        montar()
        esperarEtiqueta(EtiquetasPrueba.poliza(ID_ACTIVA))
        compose.onNodeWithTag(EtiquetasPrueba.poliza(ID_ACTIVA)).performClick()
        esperarTexto(texto(R.string.detalle_no_autorizada))

        compose.onAllNodesWithTag(EtiquetasPrueba.DETALLE).assertCountEquals(0)
        compose.onAllNodesWithTag(EtiquetasPrueba.CREDENCIAL).assertCountEquals(0)
        compose.onAllNodesWithTag(EtiquetasPrueba.COBERTURAS).assertCountEquals(0)
        compose.onAllNodesWithText("POL-", substring = true).assertCountEquals(0)
        compose.onAllNodesWithText("COP", substring = true).assertCountEquals(0)
        compose.onAllNodesWithText(texto(R.string.billetera_reintentar)).assertCountEquals(0)
    }

    @Test
    fun R6_sesion_invalida() {
        servidor.enqueue(error(401, "NO_AUTENTICADO"))

        montar()
        esperarEtiqueta(ETIQUETA_LOGIN)

        assertEquals(1, almacen.limpiezas, "La sesión se cierra al recibir 401")
        compose.onAllNodesWithTag(EtiquetasPrueba.LISTA).assertCountEquals(0)
    }

    // --- Accesibilidad dentro de R6 ------------------------------------------------------------

    @Test
    fun R6_accesibilidad_roles_descripciones_y_area_tactil() {
        servidor.enqueue(json(200, "[${resumen(ID_ACTIVA, "POL-000123", "Seguro de Vida", true, 3)}]"))
        servidor.enqueue(json(200, detalle()))

        montar()
        esperarEtiqueta(EtiquetasPrueba.poliza(ID_ACTIVA))

        compose.onNodeWithTag(EtiquetasPrueba.poliza(ID_ACTIVA))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, textos.getString(R.string.billetera_estado_activa_descripcion)))
            .assert(SemanticsMatcher("etiqueta de la acción") {
                it.config[SemanticsActions.OnClick].label == textos.getString(R.string.billetera_abrir_poliza)
            })
            .assertHasClickAction()
            .assertHeightIsAtLeast(48.dp)
        compose.onNodeWithContentDescription(texto(R.string.billetera_privacidad_acceso))
            .assertWidthIsAtLeast(48.dp)
            .assertHeightIsAtLeast(48.dp)
        compose.onNode(hasText(texto(R.string.billetera_titulo)).and(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)))
            .assertExists()

        compose.onNodeWithTag(EtiquetasPrueba.poliza(ID_ACTIVA)).performClick()
        esperarEtiqueta(EtiquetasPrueba.DETALLE)

        compose.onNodeWithContentDescription(texto(R.string.billetera_volver))
            .assertWidthIsAtLeast(48.dp)
            .assertHeightIsAtLeast(48.dp)
        compose.onNode(hasText(texto(R.string.billetera_estado_activa)).and(hasContentDescription(texto(R.string.billetera_estado_activa_descripcion))))
            .assertExists()
        listOf(
            R.string.detalle_seccion_seguro, R.string.detalle_seccion_credencial, R.string.detalle_seccion_coberturas,
            R.string.detalle_seccion_valores, R.string.detalle_seccion_vigencia,
        ).forEach {
            compose.onNode(hasText(texto(it)).and(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading))).assertExists()
        }
    }

    @Test
    fun R6_fuente_200_por_ciento_sin_recortes_y_con_area_tactil() {
        servidor.enqueue(json(200, "[${resumen(ID_ACTIVA, "POL-000123", "Seguro de Vida", true, 3)}]"))
        servidor.enqueue(json(200, detalle()))

        montar(FUENTE_200)
        esperarEtiqueta(EtiquetasPrueba.poliza(ID_ACTIVA))

        listOf("Seguro de Vida", "Personas", textos.getString(R.string.billetera_poliza_numero, "POL-000123"))
            .forEach { compose.onNodeWithText(it, useUnmergedTree = true).assertTextoCompleto() }
        compose.onNodeWithText(texto(R.string.billetera_ver_detalle), useUnmergedTree = true).assertTextoCompleto()
        compose.onNodeWithText(texto(R.string.billetera_estado_activa), useUnmergedTree = true).assertTextoCompleto()
        compose.onNodeWithTag(EtiquetasPrueba.poliza(ID_ACTIVA)).assertHeightIsAtLeast(48.dp)

        compose.onNodeWithTag(EtiquetasPrueba.poliza(ID_ACTIVA)).performClick()
        esperarEtiqueta(EtiquetasPrueba.DETALLE)

        compose.onNodeWithText(texto(R.string.detalle_titulo)).assertTextoCompleto(desplazar = false)
        listOf(
            textos.getString(R.string.detalle_credencial_numero, "CRED-0001-2026"),
            textos.getString(R.string.detalle_credencial_huella, "a1b2c3d4"),
            textos.getString(R.string.detalle_credencial_firma, "FIRMA-7788"),
            "Muerte por cualquier causa", "Incapacidad total y permanente",
            textos.getString(R.string.detalle_vigencia_inicio, "1/1/2026".fechaLarga()),
            textos.getString(R.string.detalle_vigencia_fin, "31/12/2026".fechaLarga()),
        ).forEach { compose.onNodeWithText(it).assertTextoCompleto() }
        compose.onNodeWithContentDescription(texto(R.string.billetera_volver))
            .assertWidthIsAtLeast(48.dp)
            .assertHeightIsAtLeast(48.dp)
    }

    // --- Apoyo ---------------------------------------------------------------------------------

    private enum class Destino { LISTA, DETALLE, LOGIN }

    private fun montar(fuente: Float = 1f) {
        compose.setContent {
            val configuracion = remember { textos.resources.configuration }
            val densidad = LocalDensity.current
            CompositionLocalProvider(
                LocalContext provides textos,
                LocalConfiguration provides configuracion,
                LocalDensity provides Density(densidad.density, fontScale = fuente),
            ) {
                SolventaTheme { Anfitrion() }
            }
        }
    }

    /** Sustituye a la navegación de la app: lista → detalle → volver, o login si la sesión es inválida. */
    @Composable
    private fun Anfitrion() {
        var destino by remember { mutableStateOf(Destino.LISTA) }
        var polizaId by remember { mutableStateOf("") }
        when (destino) {
            Destino.LISTA -> BilleteraRoute(
                viewModel = viewModel(key = "lista", factory = BilleteraViewModelFactory(repositorio, gestor)),
                onAbrirPoliza = { polizaId = it; destino = Destino.DETALLE },
                onAbrirPrivacidad = {},
                onIrALogin = { destino = Destino.LOGIN },
            )
            Destino.DETALLE -> DetallePolizaRoute(
                viewModel = viewModel(key = "detalle-$polizaId", factory = DetallePolizaViewModelFactory(polizaId, repositorio, gestor)),
                onVolver = { destino = Destino.LISTA },
                onIrALogin = { destino = Destino.LOGIN },
            )
            Destino.LOGIN -> Box(Modifier.testTag(ETIQUETA_LOGIN)) { Text("login") }
        }
    }

    private fun esperarEtiqueta(etiqueta: String) = compose.waitUntil(ESPERA_MS) {
        compose.onAllNodesWithTag(etiqueta).fetchSemanticsNodes().isNotEmpty()
    }

    private fun esperarTexto(texto: String) = compose.waitUntil(ESPERA_MS) {
        compose.onAllNodesWithText(texto).fetchSemanticsNodes().isNotEmpty()
    }

    private fun reiniciarEnElMismoPuerto(): MockWebServer {
        var ultimo: Throwable? = null
        repeat(20) {
            try {
                return MockWebServer().also { it.start(InetAddress.getByName("localhost"), puerto) }
            } catch (e: java.io.IOException) {
                ultimo = e
                Thread.sleep(250)
            }
        }
        throw AssertionError("No se pudo reabrir el puerto $puerto", ultimo)
    }

    private fun String.fechaLarga(): String {
        val (d, m, a) = split("/").map { it.toInt() }
        return java.time.format.DateTimeFormatter.ofLocalizedDate(java.time.format.FormatStyle.LONG)
            .withLocale(idioma).format(java.time.LocalDate.of(a, m, d))
    }

    private fun json(codigo: Int, cuerpo: String) = MockResponse().setResponseCode(codigo).setBody(cuerpo)

    private fun error(codigo: Int, clave: String, mensaje: String = "m") =
        json(codigo, """{"codigo":"$clave","mensaje":"$mensaje","correlationId":null,"detalles":{}}""")

    private fun resumen(id: String, numero: String, producto: String, vigente: Boolean, coberturas: Int) =
        """{"polizaId":"$id","numero":"$numero","estado":"${if (vigente) "ACTIVA" else "VENCIDA"}",""" +
            """"producto":"$producto","ramo":"Personas","vigencia":{"desde":"2026-01-01","hasta":"2026-12-31"},""" +
            """"vigente":$vigente,"resumenCobertura":{"sumaAsegurada":"300000000.00","moneda":"COP",""" +
            """"totalCoberturas":$coberturas}}"""

    private fun detalle() =
        """{"numero":"POL-000123","estado":"ACTIVA","producto":"Seguro de Vida","ramo":"Personas",""" +
            """"vigencia":{"desde":"2026-01-01","hasta":"2026-12-31"},"vigente":true,"prima":"1250000.50",""" +
            """"sumaAsegurada":"300000000.00","moneda":"COP","periodicidad":"MENSUAL","emitidaEn":"2026-01-01T10:00:00-05:00",""" +
            """"coberturas":[{"codigo":"MUERTE","nombre":"Muerte por cualquier causa","obligatoria":true},""" +
            """{"codigo":"INCAP","nombre":"Incapacidad total y permanente","obligatoria":false}],""" +
            """"credencial":{"numero":"CRED-0001-2026","huella":"a1b2c3d4e5f6a7b8c9d0","firmaId":"FIRMA-7788",""" +
            """"vigencia":{"desde":"2026-01-01","hasta":"2026-12-31"}}}"""

    private class AlmacenEspia : AlmacenSesionSegura {
        var limpiezas = 0
        override fun guardarUsuarioActivo(usuario: String) = Unit
        override fun usuarioActivo(): String? = null
        override fun limpiar() { limpiezas++ }
    }

    private object ClienteIdentidadInerte : ClienteIdentidad {
        override suspend fun autenticar(usuario: String, contrasena: String): ResultadoAutenticacion =
            ResultadoAutenticacion.ErrorDesconocido("no usado")
        override suspend fun confirmarCodigoMfa(codigo: String): ResultadoAutenticacion =
            ResultadoAutenticacion.ErrorDesconocido("no usado")
        override suspend fun restaurarSesion(usuario: String): ResultadoAutenticacion =
            ResultadoAutenticacion.ErrorDesconocido("no usado")
        override fun cerrarSesion(usuario: String) = Unit
    }
}

/** Sin límite de líneas, sin elipsis y sin desborde de alto (con el texto real del dispositivo). */
private fun SemanticsNodeInteraction.assertTextoCompleto(desplazar: Boolean = true) {
    if (desplazar) performScrollTo()
    assertIsDisplayed()
    val resultados = mutableListOf<TextLayoutResult>()
    val accion = fetchSemanticsNode().config[SemanticsActions.GetTextLayoutResult].action
    assertNotNull(accion)
    assertTrue(accion(resultados))
    val resultado = resultados.single()
    val texto = resultado.layoutInput.text.text
    assertEquals(Int.MAX_VALUE, resultado.layoutInput.maxLines, "Límite de líneas en: $texto")
    assertNotEquals(TextOverflow.Ellipsis, resultado.layoutInput.overflow, "Elipsis en: $texto")
    assertFalse(resultado.didOverflowHeight, "El texto se recorta: $texto")
}
