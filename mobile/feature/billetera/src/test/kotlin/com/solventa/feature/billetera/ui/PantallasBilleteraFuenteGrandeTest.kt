package com.solventa.feature.billetera.ui

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.dp
import com.solventa.feature.billetera.BilleteraUiState
import com.solventa.feature.billetera.DetallePolizaUiState
import com.solventa.feature.billetera.EtiquetasPrueba
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

private const val FUENTE_200 = 2f

/** Fuente al 200 %: nada se recorta (los textos se parten en líneas y la pantalla se desplaza). */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO-w411dp-h891dp")
class PantallasBilleteraFuenteGrandeTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun `la lista al 200 por ciento muestra completos todos los textos de la tarjeta`() {
        compose.montar(FUENTE_200) {
            BilleteraScreen(BilleteraUiState.Contenido(listOf(Muestras.activa, Muestras.vencida)), {}, {}, {})
        }

        listOf(
            "Seguro de Vida", "Personas", "Póliza POL-000123", "Suma asegurada: $ 300.000.000 COP", "3 coberturas",
            "Seguro de Auto", "Vehículos", "Póliza POL-000099", "1 cobertura",
        ).forEach { compose.onNodeWithText(it, useUnmergedTree = true).assertTextoCompleto() }
        compose.onAllNodesWithText("Ver detalle completo", useUnmergedTree = true)[0].assertTextoCompleto()
        compose.onNodeWithText("ACTIVA", useUnmergedTree = true).assertTextoCompleto()
        compose.onNodeWithTag(EtiquetasPrueba.poliza("id-activa")).assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun `el acceso a Privacidad conserva el area tactil al 200 por ciento`() {
        compose.montar(FUENTE_200) { BilleteraScreen(BilleteraUiState.Vacia, {}, {}, {}) }

        compose.onNodeWithContentDescription("Consentimientos y privacidad")
            .assertWidthIsAtLeast(48.dp)
            .assertHeightIsAtLeast(48.dp)
            .assertIsDisplayed()
    }

    @Test
    fun `la lista al 200 por ciento muestra el titulo y el estado vacio completos`() {
        compose.montar(FUENTE_200) { BilleteraScreen(BilleteraUiState.Vacia, {}, {}, {}) }

        compose.onNodeWithText("Mi Billetera").assertTextoCompleto(desplazar = false)
        compose.onNodeWithText("Aún no tienes pólizas. Cuando contrates un seguro, aparecerá aquí.").assertTextoCompleto()
    }

    @Test
    fun `el error de la lista al 200 por ciento deja alcanzable el reintento`() {
        compose.montar(FUENTE_200) { BilleteraScreen(BilleteraUiState.SinConexion, {}, {}, {}) }

        compose.onNodeWithText("No hay conexión. Revisa tu red e inténtalo de nuevo.").assertTextoCompleto()
        compose.onNodeWithText("Reintentar").performScrollTo().assertIsDisplayed().assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun `el detalle al 200 por ciento muestra completos todos los textos`() {
        compose.montar(FUENTE_200) { DetallePolizaScreen(DetallePolizaUiState.Contenido(Muestras.detalle), {}, {}) }

        compose.onNodeWithText("Carné digital").assertTextoCompleto(desplazar = false)
        listOf(
            "Seguro de Vida · Personas", "Póliza POL-000123", "ACTIVA",
            "Credencial CRED-0001-2026", "Huella: a1b2c3d4", "Firma verificable: FIRMA-7788",
            "Muerte por cualquier causa", "Incapacidad total y permanente", "Obligatoria",
            "$ 300.000.000 COP", "$ 1.250.000,50 COP · MENSUAL",
            "Inicio: 1 de enero de 2026", "Fin: 31 de diciembre de 2026",
        ).forEach { compose.onNodeWithText(it).assertTextoCompleto() }
    }

    @Test
    fun `el detalle al 200 por ciento sin datos de una poliza ajena sigue sin mostrar ninguno`() {
        compose.montar(FUENTE_200) { DetallePolizaScreen(DetallePolizaUiState.NoAutorizada, {}, {}) }

        compose.onNodeWithText("No tienes acceso a esta póliza.").assertTextoCompleto()
        compose.onAllNodesWithText("POL-", substring = true).assertCountEquals(0)
    }

    @Test
    fun `el detalle al 200 por ciento no encontrado muestra su mensaje completo sin reintento`() {
        compose.montar(FUENTE_200) { DetallePolizaScreen(DetallePolizaUiState.NoEncontrada, {}, {}) }

        compose.onNodeWithText("No encontramos esta póliza.").assertTextoCompleto()
        compose.onAllNodesWithText("Reintentar").assertCountEquals(0)
        compose.onNodeWithContentDescription("Volver").assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun `el detalle al 200 por ciento conserva el area tactil de volver y del reintento`() {
        compose.montar(FUENTE_200) { DetallePolizaScreen(DetallePolizaUiState.Error, {}, {}) }

        compose.onNodeWithContentDescription("Volver").assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp)
        compose.onNodeWithText("Reintentar").performScrollTo().assertHeightIsAtLeast(48.dp)
    }
}
