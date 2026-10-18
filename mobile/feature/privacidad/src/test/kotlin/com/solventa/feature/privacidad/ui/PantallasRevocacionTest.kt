package com.solventa.feature.privacidad.ui

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isHeading
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.solventa.feature.privacidad.Carga
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Hito
import com.solventa.feature.privacidad.dominio.TextoVigente
import com.solventa.feature.privacidad.dominio.TipoHito
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.Instant
import java.util.TimeZone
import kotlin.test.assertEquals

/** Estados visuales de la revocación y el historial (HU-M09), en es-CO salvo que se indique. */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO")
class PantallasRevocacionTest {
    @get:Rule
    val compose = createComposeRule()

    private val activo = Consentimiento(
        id = "c-1",
        estado = EstadoConsentimiento.ACTIVO,
        proposito = "PERFILAMIENTO_PRECIO",
        alcances = listOf("FA_PRODUCTOS_VIGENTES"),
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
        otorgadoEn = Instant.parse("2026-10-17T15:00:00Z"),
        vigenteHasta = Instant.parse("2027-10-17T23:59:59Z"),
        revocadoEn = null,
    )
    private val revocado = activo.copy(estado = EstadoConsentimiento.REVOCADO, revocadoEn = Instant.parse("2026-11-02T15:15:00Z"))
    private val historial = Historial(
        "c-1",
        EstadoConsentimiento.REVOCADO,
        listOf(Hito(TipoHito.OTORGADO, activo.otorgadoEn), Hito(TipoHito.REVOCADO, revocado.revocadoEn!!)),
    )
    private val texto = TextoVigente("PERFILAMIENTO_PRECIO", "es-CO", "2026-10-17.1", "Título", "Cuerpo", "Aviso", listOf(6, 12), 12)

    private val zonaOriginal = TimeZone.getDefault()

    @Before
    fun fijarZona() {
        // Fechas deterministas: la zona del "dispositivo" es la de Bogotá.
        TimeZone.setDefault(TimeZone.getTimeZone("America/Bogota"))
    }

    @After
    fun restaurarZona() {
        TimeZone.setDefault(zonaOriginal)
    }

    private class Llamadas {
        val revocar = mutableListOf<String>()
        var reintentar = 0
        var cerrar = 0
        var reintentarHistorial = 0
        val anteriores = mutableListOf<String>()
    }

    private fun pantalla(
        vista: VistaPermiso,
        aviso: AvisoPermiso? = null,
        falloRevocar: FalloConsentimiento? = null,
        escalaFuente: Float = 1f,
    ): Llamadas {
        val llamadas = Llamadas()
        compose.setContent {
            val densidad = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(densidad.density, fontScale = escalaFuente)) {
                PermisoOpenFinanceScreen(
                    vista = vista,
                    aviso = aviso,
                    falloOtorgar = null,
                    onVolver = {},
                    onOtorgar = {},
                    onReintentarOtorgar = {},
                    onCerrarError = {},
                    falloRevocar = falloRevocar,
                    onRevocar = { llamadas.revocar += it },
                    onReintentarRevocar = { llamadas.reintentar++ },
                    onCerrarErrorRevocar = { llamadas.cerrar++ },
                    onReintentarHistorial = { llamadas.reintentarHistorial++ },
                    onVerHistorialAnterior = { llamadas.anteriores += it },
                )
            }
        }
        return llamadas
    }

    // --- Revocar ---------------------------------------------------------------------------------

    @Test
    fun `un activo muestra REVOCAR AUTORIZACION y pide confirmacion explicita antes de revocar`() {
        val llamadas = pantalla(VistaPermiso.Comprobante(activo, Carga.Lista(historial.copy(estado = EstadoConsentimiento.ACTIVO))))

        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR)
            .performScrollTo()
            .assert(hasText("REVOCAR AUTORIZACIÓN"))
            .assertHeightIsAtLeast(48.dp)
            .performClick()

        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_CONFIRMAR_REVOCAR).assertIsDisplayed()
        compose.onNode(hasText("¿Revocar la autorización?") and isHeading()).assertIsDisplayed()
        assertEquals(emptyList(), llamadas.revocar, "abrir la confirmación no revoca")

        compose.onNodeWithText("REVOCAR").assertHeightIsAtLeast(48.dp).performClick()

        assertEquals(listOf("c-1"), llamadas.revocar)
        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_CONFIRMAR_REVOCAR).assertDoesNotExist()
    }

    @Test
    fun `cancelar la confirmacion no revoca`() {
        val llamadas = pantalla(VistaPermiso.Comprobante(activo))

        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().performClick()
        compose.onNodeWithText("Cancelar").performClick()

        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_CONFIRMAR_REVOCAR).assertDoesNotExist()
        assertEquals(emptyList(), llamadas.revocar)
    }

    @Test
    fun `mientras revoca el boton dice REVOCANDO y no se puede volver a tocar`() {
        pantalla(VistaPermiso.Comprobante(activo, revocando = true))

        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR)
            .performScrollTo()
            .assert(hasText("REVOCANDO…"))
            .assertIsNotEnabled()
    }

    @Test
    fun `un revocado muestra la etiqueta REVOCADA con su fecha y ya no ofrece revocar (AC5)`() {
        pantalla(VistaPermiso.Comprobante(revocado, Carga.Lista(historial)), aviso = AvisoPermiso.REVOCADA)

        compose.onNodeWithText("Autorización revocada. Solventa ya no consultará sus datos con ella.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("REVOCADA").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Revocado: 2 de noviembre de 2026").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).assertDoesNotExist()
    }

    @Test
    fun `un vencido se presenta como ya no vigente, no como revocado`() {
        val vencido = activo.copy(estado = EstadoConsentimiento.VENCIDO)
        pantalla(VistaPermiso.Comprobante(vencido), aviso = AvisoPermiso.YA_NO_VIGENTE)

        compose.onNodeWithText("Esta autorización ya no estaba vigente", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("VENCIDA").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("REVOCADA").assertDoesNotExist()
        compose.onNodeWithText("Revocado:", substring = true).assertDoesNotExist()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).assertDoesNotExist()
    }

    @Test
    fun `404 muestra el modal de revocacion con su motivo y sin reintentar`() {
        val llamadas = pantalla(VistaPermiso.Comprobante(activo), falloRevocar = FalloConsentimiento.NoEncontrado)

        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_ERROR).assertIsDisplayed()
        compose.onNodeWithText("No fue posible revocar la autorización").assertIsDisplayed()
        compose.onNodeWithText("No encontramos esta autorización.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").assertDoesNotExist()

        compose.onNodeWithText("Cerrar").performClick()
        assertEquals(1, llamadas.cerrar)
    }

    @Test
    fun `503 muestra el modal con Reintentar`() {
        val llamadas = pantalla(VistaPermiso.Comprobante(activo), falloRevocar = FalloConsentimiento.ServicioNoDisponible)

        compose.onNodeWithText("El servicio no está disponible en este momento. Intente de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").assertHeightIsAtLeast(48.dp).performClick()

        assertEquals(1, llamadas.reintentar)
    }

    @Test
    fun `sin biometria configurada el modal lo dice con el texto de revocar`() {
        pantalla(
            VistaPermiso.Comprobante(activo),
            falloRevocar = FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.NO_DISPONIBLE),
        )

        compose.onNodeWithText("Para revocar la autorización debe configurar la huella o el rostro en su dispositivo.").assertIsDisplayed()
    }

    // --- Historial ---------------------------------------------------------------------------------

    @Test
    fun `el historial muestra cada hito con fecha y hora en la zona del dispositivo (AC4)`() {
        pantalla(VistaPermiso.Comprobante(revocado, Carga.Lista(historial)))

        compose.onNode(hasText("HISTORIAL") and isHeading()).performScrollTo().assertIsDisplayed()
        // 15:00 UTC son las 10:00 en Bogotá; 15:15 UTC, las 10:15.
        compose.onNodeWithText("Otorgada: 17 de octubre de 2026", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("10:00", substring = true).assertExists()
        compose.onNodeWithText("Revocada: 2 de noviembre de 2026", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("10:15", substring = true).assertExists()
    }

    @Test
    fun `un historial vacio lo dice con texto`() {
        pantalla(VistaPermiso.Comprobante(activo, Carga.Lista(historial.copy(hitos = emptyList()))))

        compose.onNodeWithText("No hay movimientos registrados.").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `un hito desconocido se muestra de forma generica (N-1)`() {
        val conNuevo = historial.copy(hitos = listOf(Hito(TipoHito.DESCONOCIDO, Instant.parse("2026-11-03T15:00:00Z"))))
        pantalla(VistaPermiso.Comprobante(activo, Carga.Lista(conNuevo)))

        compose.onNodeWithText("Otro cambio: 3 de noviembre de 2026", substring = true).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `si el historial no carga se informa y se puede reintentar`() {
        val llamadas = pantalla(VistaPermiso.Comprobante(activo, Carga.Error(FalloConsentimiento.SinConexion)))

        compose.onNodeWithText("No fue posible cargar el historial.").performScrollTo().assertIsDisplayed()
        compose.onNode(hasText("Reintentar") and hasClickAction()).performScrollTo().performClick()

        assertEquals(1, llamadas.reintentarHistorial)
    }

    @Test
    fun `mientras carga el historial muestra el indicador`() {
        pantalla(VistaPermiso.Comprobante(activo, Carga.Cargando))

        compose.onNodeWithTag(EtiquetasPrueba.HISTORIAL).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.CARGANDO, useUnmergedTree = true).assertExists()
    }

    @Test
    fun `sin uno vigente las autorizaciones anteriores abren su historial`() {
        val llamadas = pantalla(VistaPermiso.Formulario(texto, enCurso = false, anteriores = listOf(revocado)))

        compose.onNode(hasText("AUTORIZACIONES ANTERIORES") and isHeading()).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.anterior("c-1"))
            .performScrollTo()
            .assertHeightIsAtLeast(48.dp)
            .assertIsEnabled()
            .performClick()

        assertEquals(listOf("c-1"), llamadas.anteriores)
    }

    // --- Idioma y fuente ----------------------------------------------------------------------------

    @Test
    @Config(qualifiers = "en-rUS")
    fun `en ingles el boton, la confirmacion y el historial estan traducidos`() {
        pantalla(VistaPermiso.Comprobante(activo, Carga.Lista(historial)))

        // El comprobante dice "Granted: <fecha>"; el hito del historial añade la hora tras una coma.
        compose.onNodeWithText("Granted: October 17, 2026,", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().assert(hasText("REVOKE AUTHORIZATION")).performClick()
        compose.onNodeWithText("Revoke the authorization?").assertIsDisplayed()
        compose.onNodeWithText("REVOKE").assertIsDisplayed()
    }

    @Test
    fun `con la fuente al 200 por ciento el historial y el boton siguen al alcance`() {
        val llamadas = pantalla(VistaPermiso.Comprobante(activo, Carga.Lista(historial)), escalaFuente = 2f)

        compose.onNodeWithText("Revocada:", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().assertIsDisplayed().performClick()
        compose.onNodeWithText("REVOCAR").performClick()

        assertEquals(listOf("c-1"), llamadas.revocar)
    }
}
