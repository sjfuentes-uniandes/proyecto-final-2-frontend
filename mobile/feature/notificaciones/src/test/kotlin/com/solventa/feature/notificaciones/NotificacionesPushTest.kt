package com.solventa.feature.notificaciones

import android.Manifest
import android.app.Application
import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.google.firebase.messaging.RemoteMessage
import com.solventa.core.network.ResultadoBajaDispositivo
import com.solventa.core.network.ResultadoDispositivo
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLog
import javax.crypto.KeyGenerator
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AplicacionPrueba : Application(), DependenciasNotificaciones {
    override val gestorDispositivo: GestorDispositivo get() = GestorPrueba.gestor
    override val ambitoApp = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined)
}

object GestorPrueba {
    lateinit var gestor: GestorDispositivo
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], application = AplicacionPrueba::class)
class NotificacionesPushTest {
    private val contexto: Context = ApplicationProvider.getApplicationContext()
    private val gestorNotificaciones get() = contexto.getSystemService(NotificationManager::class.java)
    private val poliza = "11111111-1111-4111-8111-111111111111"
    private val evento = "22222222-2222-4222-8222-222222222222"
    private val procesador get() = ProcesadorMensajePush(contexto)

    private fun datos(
        tipo: String = "POLIZA_EMITIDA",
        polizaId: String? = poliza,
        eventId: String? = evento,
    ) = buildMap {
        put("tipo", tipo)
        polizaId?.let { put("polizaId", it) }
        eventId?.let { put("eventId", it) }
    }

    @Before
    fun preparar() {
        shadowOf(contexto as Application).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
    }

    @Test
    fun `evento valido publica una notificacion con tag eventId`() {
        assertTrue(procesador.procesar(datos()))
        val activas = gestorNotificaciones.activeNotifications
        assertEquals(1, activas.size)
        assertEquals(evento, activas[0].tag)
        assertEquals(ProcesadorMensajePush.CANAL_ID, activas[0].notification.channelId)
    }

    @Test
    fun `el mismo eventId dos veces deja una sola notificacion`() {
        procesador.procesar(datos())
        procesador.procesar(datos())
        assertEquals(1, gestorNotificaciones.activeNotifications.size)
    }

    @Test
    fun `eventos distintos publican notificaciones distintas`() {
        procesador.procesar(datos())
        procesador.procesar(datos(eventId = "33333333-3333-4333-8333-333333333333"))
        assertEquals(2, gestorNotificaciones.activeNotifications.size)
    }

    @Test
    fun `tipo desconocido o ids invalidos no publican nada`() {
        assertFalse(procesador.procesar(datos(tipo = "OTRO")))
        assertFalse(procesador.procesar(datos(polizaId = "no-uuid")))
        assertFalse(procesador.procesar(datos(eventId = "no-uuid")))
        assertFalse(procesador.procesar(datos(polizaId = null)))
        assertFalse(procesador.procesar(datos(eventId = null)))
        assertFalse(procesador.procesar(emptyMap()))
        assertEquals(0, gestorNotificaciones.activeNotifications.size)
    }

    @Test
    fun `la notificacion es privada con version publica generica y sin datos de la poliza`() {
        procesador.procesar(datos())
        val n = gestorNotificaciones.activeNotifications[0].notification
        assertEquals(Notification.VISIBILITY_PRIVATE, n.visibility)
        val publica = assertNotNull(n.publicVersion)
        listOf(n, publica).forEach {
            val textos = listOf(it.extras.getCharSequence(Notification.EXTRA_TITLE), it.extras.getCharSequence(Notification.EXTRA_TEXT))
                .joinToString(" ")
            assertFalse(textos.contains(poliza))
            assertFalse(textos.contains(evento))
            assertFalse(textos.contains("$"))
        }
        assertEquals("Solventa", publica.extras.getCharSequence(Notification.EXTRA_TITLE))
    }

    @Test
    fun `el PendingIntent es inmutable y lleva el polizaId`() {
        procesador.procesar(datos())
        val n = gestorNotificaciones.activeNotifications[0].notification
        val pending = shadowOf(n.contentIntent)
        assertTrue(pending.isActivity)
        assertEquals(poliza, pending.savedIntent.getStringExtra(ProcesadorMensajePush.EXTRA_POLIZA_ID))
        assertTrue(n.contentIntent.creatorPackage == contexto.packageName)
        assertTrue((shadowOf(n.contentIntent).flags and android.app.PendingIntent.FLAG_IMMUTABLE) != 0)
    }

    @Test
    fun `sin permiso no publica ni falla`() {
        shadowOf(contexto as Application).denyPermissions(Manifest.permission.POST_NOTIFICATIONS)
        assertFalse(procesador.procesar(datos()))
        assertEquals(0, gestorNotificaciones.activeNotifications.size)
    }

    @Test
    fun `con notificaciones desactivadas no publica`() {
        shadowOf(gestorNotificaciones).setNotificationsEnabled(false)
        assertFalse(procesador.procesar(datos()))
    }

    @Test
    @Config(sdk = [28])
    fun `en API anterior a 33 publica sin pedir permiso`() {
        assertTrue(procesador.procesar(datos()))
    }

    @Test
    @Config(qualifiers = "es-rCO")
    fun `textos en es-CO`() {
        procesador.procesar(datos())
        val n = gestorNotificaciones.activeNotifications[0].notification
        assertEquals("Tu póliza fue emitida", n.extras.getCharSequence(Notification.EXTRA_TITLE))
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `textos en en-US`() {
        procesador.procesar(datos())
        val n = gestorNotificaciones.activeNotifications[0].notification
        assertEquals("Your policy was issued", n.extras.getCharSequence(Notification.EXTRA_TITLE))
        assertEquals("You have a new notification.", n.publicVersion.extras.getCharSequence(Notification.EXTRA_TEXT))
    }

    @Test
    fun `el servicio delega el mensaje en el procesador`() {
        val servicio = Robolectric.setupService(ServicioMensajeriaPush::class.java)
        val mensaje = RemoteMessage.Builder("destino").apply { datos().forEach { (k, v) -> addData(k, v) } }.build()
        servicio.onMessageReceived(mensaje)
        servicio.onMessageReceived(mensaje)
        assertEquals(1, gestorNotificaciones.activeNotifications.size)
    }

    @Test
    fun `onNewToken registra el token nuevo en el gestor`() {
        val red = mutableListOf<String>()
        GestorPrueba.gestor = GestorDispositivo(
            red = object : RedDispositivos {
                override suspend fun registrar(tokenPush: String): ResultadoDispositivo {
                    red += tokenPush
                    return ResultadoDispositivo.Exito("id-1")
                }

                override suspend fun darDeBaja(dispositivoId: String, autorizacion: String?) = ResultadoBajaDispositivo.Exito
            },
            proveedorToken = NotificacionesSinConfigurar,
            almacen = AlmacenDispositivoCifrado(contexto) { llavePrueba },
            tokenSesion = { "sesion" },
        )
        Robolectric.setupService(ServicioMensajeriaPush::class.java).onNewToken("tok-nuevo")
        assertEquals(listOf("tok-nuevo"), red)
    }

    @Test
    fun `el servicio ignora onNewToken si la aplicacion no expone dependencias`() {
        // Sin excepción aunque no haya gestor cableado.
        Robolectric.setupService(ServicioMensajeriaPush::class.java)
    }

    private val llavePrueba by lazy { KeyGenerator.getInstance("AES").apply { init(256) }.generateKey() }

    @Test
    fun `el almacen cifrado guarda lee y borra sin guardar el id en claro`() {
        val almacen = AlmacenDispositivoCifrado(contexto) { llavePrueba }
        assertNull(almacen.leer())
        almacen.guardar("dispositivo-secreto")
        assertEquals("dispositivo-secreto", almacen.leer())
        val crudo = contexto.getSharedPreferences("solventa_dispositivo_push", Context.MODE_PRIVATE).all.values.joinToString()
        assertFalse(crudo.contains("dispositivo-secreto"))
        almacen.borrar()
        assertNull(almacen.leer())
    }

    @Test
    fun `el almacen descarta un dato ilegible por llave invalida`() {
        AlmacenDispositivoCifrado(contexto) { llavePrueba }.guardar("id-1")
        val otra = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val almacen = AlmacenDispositivoCifrado(contexto) { otra }
        assertNull(almacen.leer())
        assertNull(AlmacenDispositivoCifrado(contexto) { llavePrueba }.leer())
    }

    @Test
    fun `ni el token ni el dispositivoId aparecen en logs errores ni textos`() {
        val tokenSecreto = "TOKEN-FCM-SECRETO-123"
        val idSecreto = "DISPOSITIVO-ID-SECRETO-456"
        ShadowLog.clear()
        val almacen = AlmacenDispositivoCifrado(contexto) { llavePrueba }
        val red = object : RedDispositivos {
            override suspend fun registrar(tokenPush: String): ResultadoDispositivo =
                if (tokenPush == "falla") throw IllegalStateException("fallo") else ResultadoDispositivo.Exito(idSecreto)

            override suspend fun darDeBaja(dispositivoId: String, autorizacion: String?) = ResultadoBajaDispositivo.Tolerado
        }
        val gestor = GestorDispositivo(red, { tokenSecreto }, almacen, { "sesion" })
        runBlocking {
            gestor.registrar()
            gestor.alTokenNuevo("falla")
            gestor.darDeBaja("sesion")
        }
        procesadorConDatos()

        val logs = ShadowLog.getLogs().joinToString { "${it.tag}${it.msg}${it.throwable}" }
        assertFalse(logs.contains(tokenSecreto) || logs.contains(idSecreto))
        assertFalse(ResultadoDispositivo.Exito(idSecreto).toString().contains(idSecreto))
        val textos = listOf(
            R.string.notificaciones_canal_nombre, R.string.notificaciones_canal_descripcion,
            R.string.notificaciones_poliza_emitida_titulo, R.string.notificaciones_poliza_emitida_texto,
            R.string.notificaciones_publica_titulo, R.string.notificaciones_publica_texto,
        ).joinToString { contexto.getString(it) }
        assertFalse(textos.contains(tokenSecreto) || textos.contains(idSecreto))
        val n = gestorNotificaciones.activeNotifications.single().notification
        val extras = n.extras.keySet().joinToString { n.extras.get(it).toString() }
        assertFalse(extras.contains(tokenSecreto) || extras.contains(idSecreto))
    }

    private fun procesadorConDatos() {
        procesador.procesar(datos())
    }
}
