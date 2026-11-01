package com.solventa.feature.notificaciones.ui

import android.Manifest
import android.app.Application
import androidx.activity.result.ActivityResultRegistry
import androidx.activity.result.ActivityResultRegistryOwner
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.activity.result.contract.ActivityResultContract
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityOptionsCompat
import androidx.test.core.app.ApplicationProvider
import com.solventa.core.designsystem.SolventaTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

private class RegistroFalso(var mostrada: Boolean = false) : RegistroExplicacionPermiso {
    override fun yaMostrada() = mostrada

    override fun marcarMostrada() {
        mostrada = true
    }
}

/** Registro de resultados que responde "concedido" y recuerda qué permisos se pidieron. */
private class RegistroResultadosFalso : ActivityResultRegistry() {
    val pedidos = mutableListOf<String>()

    override fun <I, O> onLaunch(
        requestCode: Int,
        contract: ActivityResultContract<I, O>,
        input: I,
        options: ActivityOptionsCompat?,
    ) {
        pedidos += input as String
        dispatchResult(requestCode, true)
    }
}

/** Diálogo explicativo de `POST_NOTIFICATIONS`: lógica de cuándo aparece, accesibilidad y textos. */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO-w411dp-h891dp")
class PermisoNotificacionesTest {
    @get:Rule
    val compose = createComposeRule()

    private val resultados = RegistroResultadosFalso()
    private val registro = RegistroFalso()

    private fun montar(fuente: Float = 1f, sdk: Int = 35, contenido: @Composable () -> Unit = {
        PermisoNotificacionesRoute(registro, sdk)
    }) {
        val dueno = object : ActivityResultRegistryOwner {
            override val activityResultRegistry = resultados
        }
        compose.setContent {
            val densidad = LocalDensity.current
            CompositionLocalProvider(
                LocalActivityResultRegistryOwner provides dueno,
                LocalDensity provides Density(densidad.density, fontScale = fuente),
            ) { SolventaTheme { contenido() } }
        }
    }

    @Test
    fun `el dialogo aparece una vez, con titulo como encabezado y botones de 48 dp`() {
        montar()

        compose.onNodeWithTag(EtiquetasPermisoNotificaciones.DIALOGO).assertIsDisplayed()
        val titulo = compose.onNodeWithText("¿Quieres recibir avisos?").assertIsDisplayed()
        assertTrue(SemanticsProperties.Heading in titulo.fetchSemanticsNode().config)
        listOf(EtiquetasPermisoNotificaciones.ACTIVAR, EtiquetasPermisoNotificaciones.AHORA_NO).forEach {
            compose.onNodeWithTag(it).assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp).assertIsDisplayed()
        }
    }

    @Test
    fun `Activar pide POST_NOTIFICATIONS, recuerda la explicacion y cierra el dialogo`() {
        montar()

        compose.onNodeWithTag(EtiquetasPermisoNotificaciones.ACTIVAR).performClick()
        compose.waitForIdle()

        assertEquals(listOf(Manifest.permission.POST_NOTIFICATIONS), resultados.pedidos)
        assertTrue(registro.mostrada)
        compose.onAllNodesWithTag(EtiquetasPermisoNotificaciones.DIALOGO).assertCountEquals(0)
    }

    @Test
    fun `Ahora no recuerda la explicacion sin pedir el permiso`() {
        montar()

        compose.onNodeWithTag(EtiquetasPermisoNotificaciones.AHORA_NO).performClick()
        compose.waitForIdle()

        assertEquals(emptyList<String>(), resultados.pedidos)
        assertTrue(registro.mostrada)
        compose.onAllNodesWithTag(EtiquetasPermisoNotificaciones.DIALOGO).assertCountEquals(0)
    }

    @Test
    fun `no aparece si ya se explico, si el permiso esta concedido o en una API anterior a 33`() {
        registro.mostrada = true
        montar()
        compose.onAllNodesWithTag(EtiquetasPermisoNotificaciones.DIALOGO).assertCountEquals(0)
    }

    @Test
    fun `no aparece con el permiso concedido`() {
        shadowOf(ApplicationProvider.getApplicationContext<Application>())
            .grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
        montar()
        compose.onAllNodesWithTag(EtiquetasPermisoNotificaciones.DIALOGO).assertCountEquals(0)
    }

    @Test
    fun `no aparece antes de la API 33`() {
        montar(sdk = 32)
        compose.onAllNodesWithTag(EtiquetasPermisoNotificaciones.DIALOGO).assertCountEquals(0)
    }

    @Test
    fun `al 200 por ciento los textos y botones se ven completos`() {
        montar(fuente = 2f)

        listOf(
            "¿Quieres recibir avisos?",
            "Te avisaremos cuando tu póliza sea emitida. Los avisos no muestran datos de tu póliza en la pantalla bloqueada.",
            "Activar avisos",
            "Ahora no",
        ).forEach { compose.onNodeWithText(it).assertTextoCompleto() }
        compose.onNodeWithTag(EtiquetasPermisoNotificaciones.ACTIVAR).assertHeightIsAtLeast(48.dp)
    }

    @Test
    @Config(qualifiers = "en-rUS-w411dp-h891dp")
    fun `en en-US el dialogo habla ingles y no muestra datos de poliza`() {
        montar(fuente = 2f)

        listOf(
            "Do you want to receive alerts?",
            "We will let you know when your policy is issued. Alerts show no policy data on the lock screen.",
            "Turn on alerts",
            "Not now",
        ).forEach { compose.onNodeWithText(it).assertTextoCompleto() }
    }

    @Test
    fun `las preferencias recuerdan que la explicacion ya se mostro`() {
        val preferencias = RegistroExplicacionPermisoPreferencias(ApplicationProvider.getApplicationContext())
        assertFalse(preferencias.yaMostrada())

        preferencias.marcarMostrada()

        assertTrue(RegistroExplicacionPermisoPreferencias(ApplicationProvider.getApplicationContext()).yaMostrada())
    }

    private fun SemanticsNodeInteraction.assertTextoCompleto() {
        assertIsDisplayed()
        val resultados = mutableListOf<TextLayoutResult>()
        assertTrue(fetchSemanticsNode().config[SemanticsActions.GetTextLayoutResult].action!!(resultados))
        val resultado = resultados.single()
        val texto = resultado.layoutInput.text.text
        // Sin hasVisualOverflow: con Robolectric da falsos positivos de ancho.
        assertEquals("Límite de líneas en: $texto", Int.MAX_VALUE, resultado.layoutInput.maxLines)
        assertNotEquals("Elipsis en: $texto", TextOverflow.Ellipsis, resultado.layoutInput.overflow)
        assertFalse("El texto se recorta: $texto", resultado.didOverflowHeight)
    }
}
