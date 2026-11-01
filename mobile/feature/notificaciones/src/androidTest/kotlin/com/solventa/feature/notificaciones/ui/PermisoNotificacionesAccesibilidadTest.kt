package com.solventa.feature.notificaciones.ui

import android.content.Context
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.notificaciones.R
import java.util.Locale
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

private const val FUENTE_200 = 2f

/**
 * Diálogo explicativo de `POST_NOTIFICATIONS` en dispositivo: roles, nombres accesibles, áreas
 * táctiles de 48 dp y fuente al 200 %, en es-CO y en-US.
 */
@RunWith(Parameterized::class)
class PermisoNotificacionesAccesibilidadTest(private val etiquetaIdioma: String) {
    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun idiomas() = listOf("es-CO", "en-US")
    }

    @get:Rule
    val compose = createAndroidComposeRule<ComponentActivity>()

    private val textos: Context by lazy {
        val base = compose.activity
        base.createConfigurationContext(
            Configuration(base.resources.configuration).apply { setLocale(Locale.forLanguageTag(etiquetaIdioma)) },
        )
    }

    private var activados = 0
    private var ahoraNo = 0

    private fun texto(id: Int) = textos.getString(id)

    private fun montar(fuente: Float) {
        compose.setContent {
            val configuracion = remember { textos.resources.configuration }
            val densidad = LocalDensity.current
            CompositionLocalProvider(
                LocalContext provides textos,
                LocalConfiguration provides configuracion,
                LocalDensity provides Density(densidad.density, fontScale = fuente),
            ) {
                SolventaTheme {
                    PermisoNotificacionesDialogo(onActivar = { activados++ }, onAhoraNo = { ahoraNo++ })
                }
            }
        }
    }

    @Test
    fun el_dialogo_tiene_encabezado_botones_con_rol_nombre_y_area_tactil_de_48_dp() {
        montar(1f)

        compose.onNodeWithTag(EtiquetasPermisoNotificaciones.DIALOGO).assertIsDisplayed()
        val titulo = compose.onNodeWithText(texto(R.string.notificaciones_permiso_titulo)).assertIsDisplayed()
        assertTrue(SemanticsProperties.Heading in titulo.fetchSemanticsNode().config)

        mapOf(
            EtiquetasPermisoNotificaciones.ACTIVAR to R.string.notificaciones_permiso_activar,
            EtiquetasPermisoNotificaciones.AHORA_NO to R.string.notificaciones_permiso_ahora_no,
        ).forEach { (etiqueta, textoId) ->
            val boton = compose.onNodeWithTag(etiqueta)
                .assertHasClickAction()
                .assertWidthIsAtLeast(48.dp)
                .assertHeightIsAtLeast(48.dp)
                .assertIsDisplayed()
            val config = boton.fetchSemanticsNode().config
            assertEquals(Role.Button, config[SemanticsProperties.Role])
            // El nombre accesible del botón es su texto (lo que TalkBack lee).
            assertEquals(texto(textoId), config[SemanticsProperties.Text].joinToString { it.text })
        }
    }

    @Test
    fun los_botones_responden_al_toque() {
        montar(1f)

        compose.onNodeWithTag(EtiquetasPermisoNotificaciones.ACTIVAR).performClick()
        compose.onNodeWithTag(EtiquetasPermisoNotificaciones.AHORA_NO).performClick()

        assertEquals(1, activados)
        assertEquals(1, ahoraNo)
    }

    @Test
    fun fuente_al_200_por_ciento_sin_recortes_y_con_area_tactil() {
        montar(FUENTE_200)

        listOf(
            R.string.notificaciones_permiso_titulo,
            R.string.notificaciones_permiso_mensaje,
            R.string.notificaciones_permiso_activar,
            R.string.notificaciones_permiso_ahora_no,
        ).forEach { compose.onNodeWithText(texto(it)).assertTextoCompleto() }
        listOf(EtiquetasPermisoNotificaciones.ACTIVAR, EtiquetasPermisoNotificaciones.AHORA_NO).forEach {
            compose.onNodeWithTag(it).assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp).assertIsDisplayed()
        }
    }

    private fun SemanticsNodeInteraction.assertTextoCompleto() {
        assertIsDisplayed()
        val resultados = mutableListOf<TextLayoutResult>()
        assertTrue(fetchSemanticsNode().config[SemanticsActions.GetTextLayoutResult].action!!(resultados))
        val resultado = resultados.single()
        val texto = resultado.layoutInput.text.text
        assertEquals(Int.MAX_VALUE, resultado.layoutInput.maxLines, "Límite de líneas en: $texto")
        assertNotEquals(TextOverflow.Ellipsis, resultado.layoutInput.overflow, "Elipsis en: $texto")
        assertFalse(resultado.didOverflowHeight, "El texto se recorta en alto: $texto")
        assertFalse(resultado.hasVisualOverflow, "El texto se desborda: $texto")
    }
}
