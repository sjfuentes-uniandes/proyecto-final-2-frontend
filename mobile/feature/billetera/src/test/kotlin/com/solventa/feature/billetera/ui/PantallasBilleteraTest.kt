package com.solventa.feature.billetera.ui

import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.solventa.feature.billetera.BilleteraUiState
import com.solventa.feature.billetera.DetallePolizaUiState
import com.solventa.feature.billetera.EtiquetasPrueba
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Pantallas de la billetera en la JVM (Robolectric), en es-CO y con la fuente al 100 %. */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO-w411dp-h891dp")
class PantallasBilleteraTest {
    @get:Rule
    val compose = createComposeRule()

    private val abiertas = mutableListOf<String>()
    private var reintentos = 0
    private var privacidad = 0
    private var volver = 0

    private fun lista(estado: BilleteraUiState) = compose.montar {
        BilleteraScreen(estado, { abiertas += it }, { reintentos++ }, { privacidad++ })
    }

    private fun detalle(estado: DetallePolizaUiState) = compose.montar {
        DetallePolizaScreen(estado, { reintentos++ }, { volver++ })
    }

    private fun estado(texto: String) = SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, texto)

    // --- Lista (AC1) -------------------------------------------------------------------------

    @Test
    fun `lista con activa y vencida muestra cada poliza con su resumen y su chip`() {
        lista(BilleteraUiState.Contenido(listOf(Muestras.activa, Muestras.vencida)))

        compose.onNodeWithText("Mi Billetera").assertIsDisplayed()
        compose.onNodeWithText("Seguro de Vida").assertIsDisplayed()
        compose.onNodeWithText("Personas").assertIsDisplayed()
        compose.onNodeWithText("Póliza POL-000123").assertIsDisplayed()
        compose.onNodeWithText("Suma asegurada: $ 300.000.000 COP").assertIsDisplayed()
        compose.onNodeWithText("3 coberturas").assertIsDisplayed()
        compose.onNodeWithText("Seguro de Auto").assertIsDisplayed()
        compose.onNodeWithText("1 cobertura").assertIsDisplayed()
        compose.onNodeWithText("ACTIVA", useUnmergedTree = true).assertIsDisplayed()
        compose.onNodeWithText("VENCIDA", useUnmergedTree = true).assertIsDisplayed()
        compose.onAllNodesWithText("Ver detalle completo", useUnmergedTree = true).assertCountEquals(2)
    }

    @Test
    fun `lista no muestra el banner sin conexion ni sincronizando ni descarga de PDF`() {
        lista(BilleteraUiState.Contenido(listOf(Muestras.activa)))

        compose.onAllNodesWithText("datos cifrados", substring = true, ignoreCase = true).assertCountEquals(0)
        compose.onAllNodesWithText("Sincronizando", substring = true, ignoreCase = true).assertCountEquals(0)
        compose.onAllNodesWithText("PDF", substring = true).assertCountEquals(0)
    }

    @Test
    fun `la tarjeta es un solo boton que anuncia el estado y abre el detalle de su poliza`() {
        lista(BilleteraUiState.Contenido(listOf(Muestras.activa, Muestras.vencida)))

        compose.onNodeWithTag(EtiquetasPrueba.poliza("id-activa"))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(estado("Estado: activa"))
            .assert(SemanticsMatcher("etiqueta de la acción") {
                it.config[SemanticsActions.OnClick].label == "Abrir detalle de la póliza"
            })
            .assertHeightIsAtLeast(48.dp)
            .assertHasClickAction()
        compose.onNodeWithTag(EtiquetasPrueba.poliza("id-vencida")).assert(estado("Estado: vencida")).performClick()

        assertEquals(listOf("id-vencida"), abiertas)
    }

    @Test
    fun `la tarjeta fusiona sus textos en un solo nodo y el chip no se lee dos veces`() {
        lista(BilleteraUiState.Contenido(listOf(Muestras.activa)))

        compose.onAllNodesWithTag(EtiquetasPrueba.poliza("id-activa")).assertCountEquals(1)
        compose.onNodeWithTag(EtiquetasPrueba.poliza("id-activa")).assert(hasText("Seguro de Vida"))
        compose.onAllNodes(hasContentDescription("Estado: activa")).assertCountEquals(0)
    }

    @Test
    fun `la lista vacia muestra el mensaje y ninguna tarjeta`() {
        lista(BilleteraUiState.Vacia)

        compose.onNodeWithTag(EtiquetasPrueba.VACIA).assertIsDisplayed()
        compose.onNodeWithText("Aún no tienes pólizas. Cuando contrates un seguro, aparecerá aquí.").assertIsDisplayed()
        compose.onAllNodesWithText("Reintentar").assertCountEquals(0)
    }

    @Test
    fun `sin conexion y error ofrecen reintentar y cada toque lo pide`() {
        lista(BilleteraUiState.SinConexion)
        compose.onNodeWithText("No hay conexión. Revisa tu red e inténtalo de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").assertHeightIsAtLeast(48.dp).performClick()

        assertEquals(1, reintentos)
    }

    @Test
    fun `el error generico ofrece reintentar`() {
        lista(BilleteraUiState.Error)

        compose.onNodeWithText("No pudimos cargar tus pólizas. Inténtalo de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").performClick()

        assertEquals(1, reintentos)
    }

    @Test
    fun `cargando muestra un indicador que el lector anuncia`() {
        lista(BilleteraUiState.Cargando)

        compose.onNodeWithTag(EtiquetasPrueba.CARGANDO).assert(hasContentDescription("Cargando…")).assertIsDisplayed()
    }

    @Test
    fun `el acceso provisional a Privacidad tiene descripcion, area tactil minima y abre Privacidad`() {
        lista(BilleteraUiState.Vacia)

        compose.onNodeWithContentDescription("Consentimientos y privacidad")
            .assertWidthIsAtLeast(48.dp)
            .assertHeightIsAtLeast(48.dp)
            .performClick()

        assertEquals(1, privacidad)
    }

    @Test
    fun `el titulo de la lista es un encabezado`() {
        lista(BilleteraUiState.Vacia)

        compose.onNodeWithText("Mi Billetera").assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading))
    }

    // --- Detalle (AC2) -----------------------------------------------------------------------

    @Test
    fun `el detalle muestra seguro, estado, credencial, coberturas, valores y vigencia`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle))

        compose.onNodeWithText("Carné digital").assertIsDisplayed()
        compose.onNodeWithText("Seguro de Vida · Personas").assertExists()
        compose.onNodeWithText("Póliza POL-000123").assertExists()
        compose.onNodeWithText("ACTIVA").assertExists()
        compose.onNodeWithText("Credencial CRED-0001-2026").assertExists()
        compose.onNodeWithText("Huella: a1b2c3d4").assertExists()
        compose.onNodeWithText("Firma verificable: FIRMA-7788").assertExists()
        compose.onNodeWithText("Muerte por cualquier causa").assertExists()
        compose.onNodeWithText("Incapacidad total y permanente").assertExists()
        compose.onAllNodesWithText("Obligatoria").assertCountEquals(1)
        compose.onNodeWithText("$ 300.000.000 COP").assertExists()
        compose.onNodeWithText("$ 1.250.000,50 COP · MENSUAL").assertExists()
        compose.onNodeWithText("Inicio: 1 de enero de 2026").assertExists()
        compose.onNodeWithText("Fin: 31 de diciembre de 2026").assertExists()
    }

    @Test
    fun `la huella se muestra abreviada a 8 caracteres y nunca completa`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle))

        compose.onAllNodesWithText(Muestras.HUELLA, substring = true).assertCountEquals(0)
        compose.onAllNodesWithText("a1b2c3d4e5", substring = true).assertCountEquals(0)
    }

    @Test
    fun `el chip del detalle se lee como Estado activa o Estado vencida`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle))
        compose.onNodeWithText("ACTIVA").assert(hasContentDescription("Estado: activa"))
    }

    @Test
    fun `el chip de una poliza vencida dice VENCIDA y se lee Estado vencida`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle.copy(vigente = false)))

        compose.onNodeWithText("VENCIDA").assert(hasContentDescription("Estado: vencida"))
        compose.onAllNodesWithText("ACTIVA").assertCountEquals(0)
    }

    @Test
    @Config(qualifiers = "es-rCO-w411dp-h2000dp")
    fun `el detalle se lee en orden - seguro, credencial, coberturas, valores y vigencia`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle))

        val orden = listOf(
            "Seguro asociado", "Credencial", "Coberturas vigentes", "Valores", "Vigencia",
        ).map { compose.onNode(hasText(it).and(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading))).top() }
        assertEquals(orden.sorted(), orden)
        assertEquals(5, orden.toSet().size)
    }

    @Test
    fun `el detalle no tiene valores fuera del formato del idioma`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle))

        compose.onAllNodesWithText("300000000", substring = true).assertCountEquals(0)
        compose.onAllNodesWithText("2026-01-01", substring = true).assertCountEquals(0)
    }

    @Test
    fun `volver tiene descripcion y area tactil minima`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle))

        compose.onNodeWithContentDescription("Volver").assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp).performClick()

        assertEquals(1, volver)
    }

    @Test
    fun `una poliza ajena muestra solo el mensaje generico y ningun dato (AC3)`() {
        detalle(DetallePolizaUiState.NoAutorizada)

        compose.onNodeWithText("No tienes acceso a esta póliza.").assertIsDisplayed()
        compose.onAllNodesWithTag(EtiquetasPrueba.DETALLE).assertCountEquals(0)
        compose.onAllNodesWithTag(EtiquetasPrueba.CREDENCIAL).assertCountEquals(0)
        compose.onAllNodesWithTag(EtiquetasPrueba.COBERTURAS).assertCountEquals(0)
        compose.onAllNodesWithText("Reintentar").assertCountEquals(0)
        compose.onAllNodesWithText("POL-", substring = true).assertCountEquals(0)
        compose.onAllNodesWithText("COP", substring = true).assertCountEquals(0)
    }

    @Test
    fun `una poliza inexistente muestra su mensaje sin reintentar`() {
        detalle(DetallePolizaUiState.NoEncontrada)

        compose.onNodeWithTag(EtiquetasPrueba.NO_ENCONTRADA).assertIsDisplayed()
        compose.onNodeWithText("No encontramos esta póliza.").assertIsDisplayed()
        compose.onAllNodesWithText("Reintentar").assertCountEquals(0)
    }

    @Test
    fun `el detalle con error o sin conexion ofrece reintentar`() {
        detalle(DetallePolizaUiState.SinConexion)
        compose.onNodeWithText("No hay conexión. Revisa tu red e inténtalo de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").performClick()

        assertEquals(1, reintentos)
    }

    @Test
    fun `el detalle con error generico ofrece reintentar`() {
        detalle(DetallePolizaUiState.Error)

        compose.onNodeWithText("No pudimos cargar la póliza. Inténtalo de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").performClick()

        assertEquals(1, reintentos)
    }

    @Test
    fun `el detalle cargando muestra un indicador anunciado`() {
        detalle(DetallePolizaUiState.Cargando)

        compose.onNodeWithTag(EtiquetasPrueba.CARGANDO).assert(hasContentDescription("Cargando…")).assertIsDisplayed()
    }

    // --- Formato -----------------------------------------------------------------------------

    @Test
    fun `fechas y montos siguen el formato de es-CO`() {
        val idioma = java.util.Locale.forLanguageTag("es-CO")

        assertEquals("300.000.000", formatearMonto(java.math.BigDecimal("300000000"), idioma))
        assertEquals("1.250.000,50", formatearMonto(java.math.BigDecimal("1250000.50"), idioma))
        assertEquals("1.250.000", formatearMonto(java.math.BigDecimal("1250000.00"), idioma))
        assertEquals("1 de enero de 2026", formatearFecha(LocalDate.parse("2026-01-01"), idioma))
        assertEquals("a1b2c3d4", abreviarHuella(Muestras.HUELLA))
        assertEquals("abc", abreviarHuella("abc"))
        assertTrue(formatearMonto(java.math.BigDecimal("0"), idioma) == "0")
    }
}
