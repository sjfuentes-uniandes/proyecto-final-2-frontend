package com.solventa.feature.billetera.ui

import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import com.solventa.feature.billetera.BilleteraUiState
import com.solventa.feature.billetera.DetallePolizaUiState
import com.solventa.feature.billetera.EtiquetasPrueba
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.math.BigDecimal
import java.time.LocalDate
import java.util.Locale
import kotlin.test.assertEquals

/** Las mismas pantallas en en-US: textos, estados, montos y fechas en inglés. */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "en-rUS-w411dp-h891dp")
class PantallasBilleteraEnUsTest {
    @get:Rule
    val compose = createComposeRule()

    private fun lista(estado: BilleteraUiState) = compose.montar {
        BilleteraScreen(estado, {}, {}, {})
    }

    private fun detalle(estado: DetallePolizaUiState) = compose.montar {
        DetallePolizaScreen(estado, {}, {})
    }

    @Test
    fun `lista en ingles con activa y vencida`() {
        lista(BilleteraUiState.Contenido(listOf(Muestras.activa, Muestras.vencida)))

        compose.onNodeWithText("My Wallet").assertIsDisplayed()
        compose.onNodeWithText("Policy POL-000123").assertIsDisplayed()
        compose.onNodeWithText("Sum insured: $ 300,000,000 COP").assertIsDisplayed()
        compose.onNodeWithText("3 coverages").assertIsDisplayed()
        compose.onNodeWithText("1 coverage").assertIsDisplayed()
        compose.onNodeWithText("ACTIVE", useUnmergedTree = true).assertIsDisplayed()
        compose.onNodeWithText("EXPIRED", useUnmergedTree = true).assertIsDisplayed()
        compose.onAllNodesWithText("View full details", useUnmergedTree = true).assertCountEquals(2)
        compose.onNodeWithTag(EtiquetasPrueba.poliza("id-activa"))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Status: active"))
            .assert(SemanticsMatcher("etiqueta de la acción") {
                it.config[SemanticsActions.OnClick].label == "Open policy details"
            })
        compose.onNodeWithContentDescription("Consents and privacy").assertIsDisplayed()
    }

    @Test
    fun `vacia, error y cargando en ingles`() {
        lista(BilleteraUiState.Vacia)
        compose.onNodeWithText("You don't have any policies yet. When you take out insurance, it will show up here.").assertIsDisplayed()
    }

    @Test
    fun `error de lista en ingles con reintento`() {
        lista(BilleteraUiState.SinConexion)

        compose.onNodeWithText("No connection. Check your network and try again.").assertIsDisplayed()
        compose.onNodeWithText("Retry").assertIsDisplayed()
    }

    @Test
    fun `cargando en ingles`() {
        lista(BilleteraUiState.Cargando)

        compose.onNodeWithTag(EtiquetasPrueba.CARGANDO).assert(hasContentDescription("Loading…"))
    }

    @Test
    fun `detalle en ingles con credencial, coberturas, valores y vigencia`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle))

        compose.onNodeWithText("Digital card").assertIsDisplayed()
        compose.onNodeWithText("ACTIVE").assert(hasContentDescription("Status: active"))
        compose.onNodeWithText("Credential CRED-0001-2026").assertExists()
        compose.onNodeWithText("Fingerprint: a1b2c3d4").assertExists()
        compose.onNodeWithText("Verifiable signature: FIRMA-7788").assertExists()
        compose.onAllNodesWithText("Mandatory").assertCountEquals(1)
        compose.onNodeWithText("$ 300,000,000 COP").assertExists()
        compose.onNodeWithText("$ 1,250,000.50 COP · MENSUAL").assertExists()
        compose.onNodeWithText("Start: January 1, 2026").assertExists()
        compose.onNodeWithText("End: December 31, 2026").assertExists()
        compose.onNodeWithContentDescription("Back").assertExists()
    }

    @Test
    fun `una poliza vencida en ingles dice EXPIRED`() {
        detalle(DetallePolizaUiState.Contenido(Muestras.detalle.copy(vigente = false)))

        compose.onNodeWithText("EXPIRED").assert(hasContentDescription("Status: expired"))
    }

    @Test
    fun `una poliza ajena en ingles no muestra ningun dato (AC3)`() {
        detalle(DetallePolizaUiState.NoAutorizada)

        compose.onNodeWithText("You don't have access to this policy.").assertIsDisplayed()
        compose.onAllNodesWithText("POL-", substring = true).assertCountEquals(0)
        compose.onAllNodesWithText("COP", substring = true).assertCountEquals(0)
    }

    @Test
    fun `el detalle en ingles ofrece reintentar y distingue no encontrada`() {
        detalle(DetallePolizaUiState.Error)
        compose.onNodeWithText("We couldn't load the policy. Please try again.").assertIsDisplayed()
        compose.onNodeWithText("Retry").assertIsDisplayed()
    }

    @Test
    fun `no encontrada en ingles`() {
        detalle(DetallePolizaUiState.NoEncontrada)

        compose.onNodeWithText("We couldn't find this policy.").assertIsDisplayed()
    }

    @Test
    fun `en ingles al 200 por ciento lista y detalle muestran completos sus textos`() {
        compose.montar(2f) {
            BilleteraScreen(BilleteraUiState.Contenido(listOf(Muestras.activa)), {}, {}, {})
        }
        listOf("Policy POL-000123", "Sum insured: $ 300,000,000 COP", "3 coverages").forEach {
            compose.onNodeWithText(it, useUnmergedTree = true).assertTextoCompleto()
        }
        compose.onNodeWithText("View full details", useUnmergedTree = true).assertTextoCompleto()
    }

    @Test
    fun `el detalle en ingles al 200 por ciento muestra completos sus textos`() {
        compose.montar(2f) { DetallePolizaScreen(DetallePolizaUiState.Contenido(Muestras.detalle), {}, {}) }

        compose.onNodeWithText("Digital card").assertTextoCompleto(desplazar = false)
        listOf(
            "Verifiable signature: FIRMA-7788", "Fingerprint: a1b2c3d4", "Mandatory",
            "$ 1,250,000.50 COP · MENSUAL", "Start: January 1, 2026", "End: December 31, 2026",
        ).forEach { compose.onNodeWithText(it).assertTextoCompleto() }
    }

    @Test
    fun `fechas y montos siguen el formato de en-US`() {
        assertEquals("300,000,000", formatearMonto(BigDecimal("300000000"), Locale.US))
        assertEquals("1,250,000.50", formatearMonto(BigDecimal("1250000.50"), Locale.US))
        assertEquals("January 1, 2026", formatearFecha(LocalDate.parse("2026-01-01"), Locale.US))
    }
}
