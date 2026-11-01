package com.solventa.feature.notificaciones

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification
import androidx.activity.ComponentActivity
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/** Hace de `MainActivity` en el APK de pruebas: anota el `polizaId` que trae cada intent de apertura. */
class ActividadAperturaPrueba : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        anotar(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        anotar(intent)
    }

    private fun anotar(intent: Intent?) {
        intent?.getStringExtra(ProcesadorMensajePush.EXTRA_POLIZA_ID)?.let(abiertos::add)
    }

    companion object {
        val abiertos = CopyOnWriteArrayList<String>()
    }
}

private const val ESPERA_MS = 10_000L
private const val POLIZA = "11111111-1111-1111-1111-111111111111"
private const val EVENTO_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
private const val EVENTO_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

/**
 * HU-M11, tramo de presentación en dispositivo: canal, visibilidad en pantalla bloqueada, versión
 * pública genérica, `PendingIntent` con el `polizaId` y un solo aviso por evento (AC1 y AC2).
 */
class NotificacionPublicadaTest {
    // El permiso de notificaciones solo existe desde la API 33.
    @get:Rule
    val permiso: GrantPermissionRule = GrantPermissionRule.grant(
        *if (Build.VERSION.SDK_INT >= 33) arrayOf("android.permission.POST_NOTIFICATIONS") else emptyArray(),
    )

    private val contexto: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private val gestor = contexto.getSystemService(NotificationManager::class.java)
    private val procesador = ProcesadorMensajePush(contexto)

    @Before
    fun limpiar() {
        gestor.cancelAll()
        ActividadAperturaPrueba.abiertos.clear()
    }

    @After
    fun terminar() {
        gestor.cancelAll()
    }

    private fun mensaje(eventId: String, polizaId: String = POLIZA) = mapOf(
        ProcesadorMensajePush.CLAVE_TIPO to ProcesadorMensajePush.TIPO_POLIZA_EMITIDA,
        ProcesadorMensajePush.CLAVE_POLIZA_ID to polizaId,
        ProcesadorMensajePush.CLAVE_EVENT_ID to eventId,
    )

    private fun delEvento(eventId: String): List<StatusBarNotification> =
        gestor.activeNotifications.filter { it.packageName == contexto.packageName && it.tag == eventId }

    private fun esperarEvento(eventId: String): StatusBarNotification {
        val limite = System.currentTimeMillis() + ESPERA_MS
        while (System.currentTimeMillis() < limite) {
            delEvento(eventId).firstOrNull()?.let { return it }
            Thread.sleep(50)
        }
        throw AssertionError("La notificación del evento no se publicó")
    }

    @Test
    fun AC1_la_notificacion_se_publica_en_el_canal_con_visibilidad_privada_y_version_publica_generica() {
        assertTrue(procesador.procesar(mensaje(EVENTO_A)))

        val publicada = esperarEvento(EVENTO_A)
        val notificacion = publicada.notification
        assertEquals(ProcesadorMensajePush.CANAL_ID, notificacion.channelId)
        assertEquals(Notification.VISIBILITY_PRIVATE, notificacion.visibility)

        val canal = gestor.getNotificationChannel(ProcesadorMensajePush.CANAL_ID)
        assertNotNull(canal)
        assertEquals(Notification.VISIBILITY_PRIVATE, canal.lockscreenVisibility)
        assertEquals(contexto.getString(R.string.notificaciones_canal_nombre), canal.name.toString())

        val publica = assertNotNull(notificacion.publicVersion)
        assertEquals(contexto.getString(R.string.notificaciones_publica_titulo), publica.extras.getCharSequence(Notification.EXTRA_TITLE).toString())
        assertEquals(contexto.getString(R.string.notificaciones_publica_texto), publica.extras.getCharSequence(Notification.EXTRA_TEXT).toString())

        // Ni la versión completa ni la pública exponen el polizaId ni el eventId.
        listOf(notificacion, publica).forEach { n ->
            val visibles = listOf(Notification.EXTRA_TITLE, Notification.EXTRA_TEXT, Notification.EXTRA_SUB_TEXT, Notification.EXTRA_BIG_TEXT)
                .mapNotNull { n.extras.getCharSequence(it)?.toString() }
            visibles.forEach { assertFalse(it.contains(POLIZA) || it.contains(EVENTO_A), "Dato sensible en: $it") }
        }
        assertEquals(contexto.getString(R.string.notificaciones_poliza_emitida_titulo), notificacion.extras.getCharSequence(Notification.EXTRA_TITLE).toString())
    }

    @Test
    fun AC1_el_PendingIntent_abre_la_app_con_el_polizaId() {
        assertTrue(procesador.procesar(mensaje(EVENTO_A)))
        val notificacion = esperarEvento(EVENTO_A).notification
        assertNotNull(notificacion.contentIntent)

        // La app debe estar en primer plano: así Android permite lanzar la actividad desde el PendingIntent.
        ActivityScenario.launch(ActividadAperturaPrueba::class.java).use {
            notificacion.contentIntent.send()
            val limite = System.currentTimeMillis() + ESPERA_MS
            while (POLIZA !in ActividadAperturaPrueba.abiertos && System.currentTimeMillis() < limite) Thread.sleep(50)
        }
        assertTrue(POLIZA in ActividadAperturaPrueba.abiertos, "El intent de apertura no trajo el polizaId")
    }

    @Test
    fun AC2_el_mismo_eventId_dos_veces_deja_una_sola_notificacion() {
        assertTrue(procesador.procesar(mensaje(EVENTO_A)))
        assertTrue(procesador.procesar(mensaje(EVENTO_A)))
        esperarEvento(EVENTO_A)
        Thread.sleep(500)

        assertEquals(1, delEvento(EVENTO_A).size)
        assertEquals(1, gestor.activeNotifications.count { it.packageName == contexto.packageName })
    }

    @Test
    fun AC2_eventos_distintos_dan_avisos_distintos() {
        assertTrue(procesador.procesar(mensaje(EVENTO_A)))
        assertTrue(procesador.procesar(mensaje(EVENTO_B)))
        esperarEvento(EVENTO_A)
        esperarEvento(EVENTO_B)

        assertEquals(2, gestor.activeNotifications.count { it.packageName == contexto.packageName })
    }

    @Test
    fun un_mensaje_invalido_no_publica_nada() {
        assertFalse(procesador.procesar(mensaje(EVENTO_A, polizaId = "no-es-uuid")))
        assertFalse(procesador.procesar(mapOf(ProcesadorMensajePush.CLAVE_TIPO to "OTRO")))
        Thread.sleep(500)

        assertNull(gestor.activeNotifications.firstOrNull { it.packageName == contexto.packageName })
    }
}
