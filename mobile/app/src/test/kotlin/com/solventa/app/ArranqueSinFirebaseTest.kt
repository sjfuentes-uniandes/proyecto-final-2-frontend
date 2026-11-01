package com.solventa.app

import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import com.solventa.feature.notificaciones.ConfiguracionFirebase
import com.solventa.feature.notificaciones.ProcesadorMensajePush
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Aplicación real de las pruebas: Firebase sin valores, como en un clon sin `local.properties`. */
class SolventaAppSinFirebase : SolventaApp() {
    override fun configuracionFirebase() = ConfiguracionFirebase("", "", "", "")
}

/** Sin configuración de Firebase la app arranca igual: el proveedor es el no-op y no hay registro. */
@RunWith(RobolectricTestRunner::class)
@Config(application = SolventaAppSinFirebase::class)
class ArranqueSinFirebaseTest {
    private val app = ApplicationProvider.getApplicationContext<SolventaApp>()

    @Test
    fun `la app arranca con las notificaciones sin configurar`() {
        assertNotNull(app.gestorSesion)
        assertNotNull(app.gestorDispositivo)
        assertFalse(app.configuracionFirebase().estaCompleta)
        assertFalse(app.gestorDispositivo.registroPendiente)
    }

    @Test
    fun `sin Firebase ni sesion registrar no falla y queda pendiente hasta que haya sesion`() {
        kotlinx.coroutines.runBlocking { app.gestorDispositivo.registrar() }

        assertTrue(app.gestorDispositivo.registroPendiente)
    }

    @Test
    fun `el destino pendiente guarda el polizaId valido del intent y descarta el invalido`() {
        val valido = "11111111-1111-1111-1111-111111111111"

        app.destinoPendiente.desdeIntent(Intent().putExtra(ProcesadorMensajePush.EXTRA_POLIZA_ID, valido))
        assertEquals(valido, app.destinoPendiente.polizaId.value)

        app.destinoPendiente.consumir()
        app.destinoPendiente.desdeIntent(Intent().putExtra(ProcesadorMensajePush.EXTRA_POLIZA_ID, "x"))
        assertNull(app.destinoPendiente.polizaId.value)
        app.destinoPendiente.desdeIntent(null)
        assertNull(app.destinoPendiente.polizaId.value)
    }
}
