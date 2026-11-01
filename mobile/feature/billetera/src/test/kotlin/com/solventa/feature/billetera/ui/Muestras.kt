package com.solventa.feature.billetera.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.junit4.ComposeContentTestRule
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.Credencial
import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Vigencia
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** Datos sintéticos de las pruebas de pantalla (sin datos reales). */
internal object Muestras {
    private val vigencia = Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"))
    const val HUELLA = "a1b2c3d4e5f6a7b8c9d0"

    val activa = PolizaResumen(
        polizaId = "id-activa",
        numero = "POL-000123",
        estado = "ACTIVA",
        producto = "Seguro de Vida",
        ramo = "Personas",
        vigencia = vigencia,
        vigente = true,
        resumenCobertura = ResumenCobertura(BigDecimal("300000000"), "COP", 3),
    )
    val vencida = activa.copy(
        polizaId = "id-vencida",
        numero = "POL-000099",
        estado = "VENCIDA",
        producto = "Seguro de Auto",
        ramo = "Vehículos",
        vigente = false,
        resumenCobertura = ResumenCobertura(BigDecimal("80000000"), "COP", 1),
    )
    val detalle = PolizaDetalle(
        numero = "POL-000123",
        estado = "ACTIVA",
        producto = "Seguro de Vida",
        ramo = "Personas",
        vigencia = vigencia,
        vigente = true,
        prima = BigDecimal("1250000.50"),
        sumaAsegurada = BigDecimal("300000000"),
        moneda = "COP",
        periodicidad = "MENSUAL",
        emitidaEn = OffsetDateTime.parse("2026-01-01T10:00:00-05:00"),
        coberturas = listOf(
            Cobertura("MUERTE", "Muerte por cualquier causa", true),
            Cobertura("INCAP", "Incapacidad total y permanente", false),
        ),
        credencial = Credencial("CRED-0001-2026", HUELLA, "FIRMA-7788", vigencia),
    )
}

/** Compone [contenido] con el tema y, si [fuente] no es 1, con esa escala de fuente (200 % = 2f). */
internal fun ComposeContentTestRule.montar(fuente: Float = 1f, contenido: @Composable () -> Unit) = setContent {
    val densidad = LocalDensity.current
    CompositionLocalProvider(LocalDensity provides Density(densidad.density, fontScale = fuente)) {
        SolventaTheme { contenido() }
    }
}

/**
 * El texto del nodo se ve completo (sin recorte por línea ni elipsis). Si [desplazar], además se llega
 * a él con scroll; la barra superior no se desplaza, por eso se prueba con `desplazar = false`.
 */
internal fun SemanticsNodeInteraction.assertTextoCompleto(desplazar: Boolean = true) {
    if (desplazar) performScrollTo()
    assertIsDisplayed()
    val resultados = mutableListOf<TextLayoutResult>()
    val accion = fetchSemanticsNode().config[SemanticsActions.GetTextLayoutResult].action
    assertNotNull(accion)
    assertTrue(accion(resultados))
    val resultado = resultados.single()
    // No se usa hasVisualOverflow: con la medición de texto de Robolectric reporta desborde de ancho
    // falso en una sola línea. Se exige que no haya límite de líneas, ni elipsis, ni desborde de alto.
    val texto = resultado.layoutInput.text.text
    assertEquals(Int.MAX_VALUE, resultado.layoutInput.maxLines, "Límite de líneas en: $texto")
    assertNotEquals(TextOverflow.Ellipsis, resultado.layoutInput.overflow, "Elipsis en: $texto")
    assertFalse(resultado.didOverflowHeight, "El texto se recorta: $texto")
}

internal fun SemanticsNodeInteraction.top() = getBoundsInRoot().top
