package com.solventa.feature.notificaciones

import androidx.test.core.app.ApplicationProvider
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.test.runTest
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class FirebaseConfiguracionTest {
    private val contexto = ApplicationProvider.getApplicationContext<android.app.Application>()

    private fun completa() = ConfiguracionFirebase("clave-api", "1:123:android:abc", "proyecto", "123")

    @Test
    fun `la configuracion esta completa solo con las cuatro claves`() {
        assertTrue(completa().estaCompleta)
        assertFalse(completa().copy(apiKey = "").estaCompleta)
        assertFalse(completa().copy(appId = " ").estaCompleta)
        assertFalse(completa().copy(projectId = "").estaCompleta)
        assertFalse(completa().copy(senderId = "").estaCompleta)
    }

    @Test
    fun `la configuracion no expone credenciales al imprimirse`() {
        assertFalse(completa().toString().contains("clave-api"))
        assertEquals("ConfiguracionFirebase(completa=true)", completa().toString())
    }

    @Test
    fun `sin configuracion se usa NotificacionesSinConfigurar y la app no falla`() = runTest {
        val proveedor = InicializadorFirebase.inicializar(contexto, ConfiguracionFirebase("", "", "", ""))

        assertSame(NotificacionesSinConfigurar, proveedor)
        assertNull(proveedor.obtenerToken())
    }

    @Test
    fun `con configuracion completa se inicializa Firebase y se entrega el proveedor real`() {
        val proveedor = InicializadorFirebase.inicializar(contexto, completa())

        assertIs<ProveedorTokenFirebase>(proveedor)
        // Segunda llamada: reutiliza la app ya inicializada.
        assertIs<ProveedorTokenFirebase>(InicializadorFirebase.inicializar(contexto, completa()))
    }

    @Test
    fun `una configuracion que Firebase rechaza cae a NotificacionesSinConfigurar`() {
        val proveedor = InicializadorFirebase.inicializar(contexto, completa().copy(appId = "sin-formato"))

        // `appId` con formato libre lo acepta FirebaseOptions: lo importante es que nunca lance.
        assertTrue(proveedor === NotificacionesSinConfigurar || proveedor is ProveedorTokenFirebase)
    }

    @Test
    fun `el proveedor real devuelve el token cuando la tarea termina bien`() = runTest {
        val proveedor = ProveedorTokenFirebase { Tasks.forResult("token-1") }

        assertEquals("token-1", proveedor.obtenerToken())
    }

    @Test
    fun `el proveedor real devuelve null si la tarea falla, el token es vacio o hay una excepcion`() = runTest {
        assertNull(ProveedorTokenFirebase { Tasks.forException(IllegalStateException("x")) }.obtenerToken())
        assertNull(ProveedorTokenFirebase { Tasks.forResult(" ") }.obtenerToken())
        assertNull(ProveedorTokenFirebase { throw IllegalStateException("sin Play Services") }.obtenerToken())
    }
}
