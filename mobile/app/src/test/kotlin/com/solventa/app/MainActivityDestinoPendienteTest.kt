package com.solventa.app

import android.app.Activity
import android.content.Intent
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onLast
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import com.solventa.feature.notificaciones.ProcesadorMensajePush
import okhttp3.mockwebserver.MockResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import com.solventa.feature.login.R as RLogin

private const val POLIZA = "11111111-1111-1111-1111-111111111111"
private const val RUTA_DETALLE = "/v1/polizas/$POLIZA"

/** El destino pendiente de la notificación se consume una sola vez: rotar o repetir el intent no reabre el detalle. */
@RunWith(RobolectricTestRunner::class)
@Config(application = AppSimuladaSinConfigurar::class, qualifiers = "es-rCO-w411dp-h891dp")
class MainActivityDestinoPendienteTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private val app = ApplicationProvider.getApplicationContext<AppSimuladaSinConfigurar>()

    @Before
    fun preparar() {
        ApiSimulada.reiniciar { solicitud ->
            when (solicitud.path?.substringBefore('?')) {
                "/v1/sesion" -> MockResponse().setResponseCode(200)
                    .setBody("""{"clienteId":"c1","serviciosAutorizados":[],"expiraEn":"2026-10-18T00:00:00Z"}""")
                else -> MockResponse().setResponseCode(404)
            }
        }
    }

    private fun intentDeNotificacion() =
        Intent(app, MainActivity::class.java).putExtra(ProcesadorMensajePush.EXTRA_POLIZA_ID, POLIZA)

    private fun ingresar() {
        val campos = compose.onAllNodes(hasSetTextAction())
        val total = campos.fetchSemanticsNodes().size
        campos[total - 2].performTextInput("persona@ejemplo.co")
        campos[total - 1].performTextInput("Clave-sintetica-1")
        compose.onAllNodesWithText(app.getString(RLogin.string.login_boton_ingresar)).onLast().performClick()
        compose.waitForIdle()
    }

    private fun detallesPedidos() = ApiSimulada.recibidas("GET", RUTA_DETALLE).size

    @Test
    fun `tras abrir el detalle el destino queda consumido y rotar la pantalla no lo reabre`() {
        val controlador = Robolectric.buildActivity(MainActivity::class.java, intentDeNotificacion()).setup()
        compose.waitForIdle()
        ingresar()
        assertTrue(esperarHasta { detallesPedidos() == 1 })
        assertNull(app.destinoPendiente.polizaId.value)

        controlador.recreate()
        compose.waitForIdle()
        esperarHasta(500) { false }

        assertEquals(1, detallesPedidos())
        assertNull(app.destinoPendiente.polizaId.value)
    }

    @Test
    fun `repetir onNewIntent con el mismo intent ya procesado no reabre el detalle`() {
        val intent = intentDeNotificacion()
        val controlador = Robolectric.buildActivity(MainActivity::class.java, intent).setup()
        compose.waitForIdle()
        ingresar()
        assertTrue(esperarHasta { detallesPedidos() == 1 })

        controlador.newIntent(intent)
        controlador.get().let { actividad: Activity -> assertEquals(intent, actividad.intent) }
        compose.waitForIdle()
        esperarHasta(500) { false }

        assertEquals(1, detallesPedidos())
        assertNull(app.destinoPendiente.polizaId.value)
    }

    @Test
    fun `sin sesion el destino espera y se consume una sola vez al ingresar`() {
        Robolectric.buildActivity(MainActivity::class.java, intentDeNotificacion()).setup()
        compose.waitForIdle()

        assertEquals(POLIZA, app.destinoPendiente.polizaId.value)
        assertEquals(0, detallesPedidos())

        ingresar()

        assertTrue(esperarHasta { detallesPedidos() == 1 })
        assertNull(app.destinoPendiente.polizaId.value)
    }
}
