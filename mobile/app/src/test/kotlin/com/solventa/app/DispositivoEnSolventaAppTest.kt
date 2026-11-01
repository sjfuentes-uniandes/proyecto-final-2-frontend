package com.solventa.app

import androidx.test.core.app.ApplicationProvider
import com.solventa.core.auth.EstadoSesion
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

private const val RUTA_BAJA = "/v1/dispositivos/$DISPOSITIVO_ID"
private const val BEARER = "Bearer $TOKEN_ID_SESION"

/** Baja del dispositivo al cerrar sesión (token capturado antes de limpiar). */
@RunWith(RobolectricTestRunner::class)
@Config(application = AppSimuladaConToken::class)
class BajaDispositivoAlCerrarSesionTest {
    private val app = ApplicationProvider.getApplicationContext<AppSimuladaConToken>()

    @Before
    fun preparar() {
        ApiSimulada.reiniciar { MockResponse().setResponseCode(204) }
        app.almacenDispositivo.guardar(DISPOSITIVO_ID)
        assertTrue(runBlocking { app.gestorSesion.restaurarSesion() })
    }

    @Test
    fun `el DELETE sale con el token anterior y despues se limpia la sesion`() {
        app.gestorSesion.cerrarSesion()

        assertTrue(esperarHasta { ApiSimulada.recibidas("DELETE", RUTA_BAJA).isNotEmpty() })
        assertEquals(BEARER, ApiSimulada.recibidas("DELETE", RUTA_BAJA).single().getHeader("Authorization"))
        assertNull(app.gestorSesion.actual())
        assertEquals(EstadoSesion.NoAutenticada, app.gestorSesion.estado.value)
        assertTrue(esperarHasta { app.almacenDispositivo.leer() == null })
    }

    @Test
    fun `si la baja falla el cierre de sesion igual termina y el dispositivoId local se borra`() {
        ApiSimulada.reiniciar { MockResponse().setResponseCode(401) }

        app.gestorSesion.cerrarSesion()

        assertEquals(EstadoSesion.NoAutenticada, app.gestorSesion.estado.value)
        assertNull(app.gestorSesion.actual())
        assertTrue(esperarHasta { ApiSimulada.recibidas("DELETE", RUTA_BAJA).isNotEmpty() })
        assertEquals(BEARER, ApiSimulada.recibidas("DELETE", RUTA_BAJA).single().getHeader("Authorization"))
        assertTrue(esperarHasta { app.almacenDispositivo.leer() == null })
    }

    @Test
    fun `si el servidor corta la conexion el cierre de sesion tambien termina`() {
        ApiSimulada.reiniciar { MockResponse().setSocketPolicy(okhttp3.mockwebserver.SocketPolicy.DISCONNECT_AFTER_REQUEST) }

        app.gestorSesion.cerrarSesion()

        assertEquals(EstadoSesion.NoAutenticada, app.gestorSesion.estado.value)
        assertTrue(esperarHasta { app.almacenDispositivo.leer() == null })
    }
}

/** Registro del dispositivo cuando la sesión pasa a Autenticada. */
@RunWith(RobolectricTestRunner::class)
@Config(application = AppSimuladaConToken::class)
class RegistroDispositivoAlAutenticarseTest {
    private val app = ApplicationProvider.getApplicationContext<AppSimuladaConToken>()

    @Test
    fun `al pasar a Autenticada se registra el dispositivo con el token en el cuerpo`() {
        ApiSimulada.reiniciar { MockResponse().setResponseCode(201).setBody("""{"dispositivoId":"$DISPOSITIVO_ID"}""") }

        assertTrue(runBlocking { app.gestorSesion.restaurarSesion() })

        assertTrue(esperarHasta { ApiSimulada.recibidas("POST", "/v1/dispositivos").isNotEmpty() })
        val registro = ApiSimulada.recibidas("POST", "/v1/dispositivos").single()
        assertEquals(BEARER, registro.getHeader("Authorization"))
        assertTrue(registro.body.readUtf8().contains(TOKEN_PUSH))
        assertTrue(esperarHasta { app.almacenDispositivo.leer() == DISPOSITIVO_ID })
    }

    @Test
    fun `sin sesion no se llama a la red`() {
        ApiSimulada.reiniciar { MockResponse().setResponseCode(201) }

        Thread.sleep(300)

        assertTrue(ApiSimulada.recibidas.isEmpty())
    }
}

/** Con Firebase sin configurar (no-op) la autenticación no toca la red del dispositivo. */
@RunWith(RobolectricTestRunner::class)
@Config(application = AppSimuladaSinConfigurar::class)
class SinConfigurarNoLlamaALaRedTest {
    private val app = ApplicationProvider.getApplicationContext<AppSimuladaSinConfigurar>()

    @Test
    fun `con NotificacionesSinConfigurar autenticarse no llama a la red`() {
        ApiSimulada.reiniciar { MockResponse().setResponseCode(201) }

        assertTrue(runBlocking { app.gestorSesion.restaurarSesion() })

        // El observador corre en otro hilo: se le da margen y se comprueba que no hubo ninguna llamada.
        Thread.sleep(500)
        esperarHasta(200) { false }
        assertTrue(ApiSimulada.recibidas.isEmpty())
        assertNull(app.almacenDispositivo.leer())
    }
}
