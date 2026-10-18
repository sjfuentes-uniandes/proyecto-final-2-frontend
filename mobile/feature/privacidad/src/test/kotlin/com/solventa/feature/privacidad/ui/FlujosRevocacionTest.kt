package com.solventa.feature.privacidad.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.solventa.feature.privacidad.EstadoRevocacion
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.PrivacidadViewModel
import com.solventa.feature.privacidad.casos.ListarConsentimientos
import com.solventa.feature.privacidad.casos.ObtenerTextoVigente
import com.solventa.feature.privacidad.casos.OtorgarConsentimiento
import com.solventa.feature.privacidad.casos.RevocarConsentimiento
import com.solventa.feature.privacidad.casos.VerDetalleConsentimiento
import com.solventa.feature.privacidad.casos.VerHistorialConsentimiento
import com.solventa.feature.privacidad.dominio.AccionBiometrica
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Hito
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.TextoVigente
import com.solventa.feature.privacidad.dominio.TipoHito
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.Instant
import kotlin.test.assertEquals

/**
 * Revocación de punta a punta en la app (HU-M09): Route, ViewModel y casos de uso reales; solo el
 * repositorio (red) y la biometría son dobles.
 */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO")
class FlujosRevocacionTest {
    @get:Rule
    val compose = createComposeRule()

    private val repositorio = mockk<RepositorioConsentimientos>()
    private val confirmaciones = ArrayDeque<ConfirmacionBiometrica>()
    private val acciones = mutableListOf<AccionBiometrica>()
    private val verificador = VerificadorBiometrico { accion ->
        acciones += accion
        confirmaciones.removeFirstOrNull() ?: ConfirmacionBiometrica.CONFIRMADA
    }
    private lateinit var viewModel: PrivacidadViewModel

    private val activo = Consentimiento(
        id = "c-7",
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
    private val texto = TextoVigente("PERFILAMIENTO_PRECIO", "es-CO", "2026-10-17.1", "Título", "Cuerpo", "Aviso", listOf(6, 12), 12)

    @Before
    fun preparar() {
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(activo))
        coEvery { repositorio.detalle("c-7") } returns Resultado.Exito(activo)
        coEvery { repositorio.textoVigente(any(), any()) } returns Resultado.Exito(texto)
        coEvery { repositorio.historial("c-7") } returns Resultado.Exito(
            Historial("c-7", EstadoConsentimiento.ACTIVO, listOf(Hito(TipoHito.OTORGADO, activo.otorgadoEn))),
        )
        viewModel = PrivacidadViewModel(
            ListarConsentimientos(repositorio),
            VerDetalleConsentimiento(repositorio),
            ObtenerTextoVigente(repositorio),
            OtorgarConsentimiento(repositorio, verificador),
            RevocarConsentimiento(repositorio, verificador),
            VerHistorialConsentimiento(repositorio),
        )
        // Como al venir del panel: la lista ya está cargada y tiene el ACTIVO.
        viewModel.cargarConsentimientos()
    }

    private fun abrirDetalle() {
        compose.setContent { PermisoOpenFinanceRoute(viewModel, onVolver = {}) }
        compose.waitForIdle()
    }

    private fun revocarConConfirmacion() {
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().performClick()
        compose.onNodeWithText("REVOCAR").performClick()
        compose.waitForIdle()
    }

    @Test
    fun `revocar muestra el aviso, la etiqueta REVOCADA y el historial con los dos hitos (AC1, AC4)`() {
        coEvery { repositorio.revocar("c-7") } returns Resultado.Exito(revocado)
        coEvery { repositorio.historial("c-7") } returnsMany listOf(
            Resultado.Exito(Historial("c-7", EstadoConsentimiento.ACTIVO, listOf(Hito(TipoHito.OTORGADO, activo.otorgadoEn)))),
            Resultado.Exito(
                Historial(
                    "c-7",
                    EstadoConsentimiento.REVOCADO,
                    listOf(Hito(TipoHito.OTORGADO, activo.otorgadoEn), Hito(TipoHito.REVOCADO, revocado.revocadoEn!!)),
                ),
            ),
        )
        abrirDetalle()

        revocarConConfirmacion()

        compose.onNodeWithText("Autorización revocada. Solventa ya no consultará sus datos con ella.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("REVOCADA").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Revocada: 2 de noviembre de 2026", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).assertDoesNotExist()
        assertEquals(listOf(AccionBiometrica.REVOCAR), acciones)
        coVerify(exactly = 1) { repositorio.revocar("c-7") }
        assertEquals(EstadoRevocacion.Inactivo, viewModel.uiState.value.revocacion)
    }

    @Test
    fun `si ya habia vencido se informa que no estaba vigente, no que se revoco`() {
        coEvery { repositorio.revocar("c-7") } returns Resultado.Exito(activo.copy(estado = EstadoConsentimiento.VENCIDO))
        abrirDetalle()

        revocarConConfirmacion()

        compose.onNodeWithText("Esta autorización ya no estaba vigente", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("VENCIDA").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Autorización revocada", substring = true).assertDoesNotExist()
    }

    @Test
    fun `un estado desconocido se informa sin interpretarlo`() {
        coEvery { repositorio.revocar("c-7") } returns Resultado.Exito(activo.copy(estado = EstadoConsentimiento.DESCONOCIDO))
        abrirDetalle()

        revocarConConfirmacion()

        compose.onNodeWithText("El estado de la autorización cambió. Revise el detalle.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("ESTADO DESCONOCIDO").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `cancelar la confirmacion no pide biometria ni llama al servidor`() {
        abrirDetalle()

        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().performClick()
        compose.onNodeWithText("Cancelar").performClick()
        compose.waitForIdle()

        assertEquals(emptyList(), acciones)
        coVerify(exactly = 0) { repositorio.revocar(any()) }
    }

    @Test
    fun `cancelar la biometria se informa sin modal y sin llamar al servidor`() {
        confirmaciones += ConfirmacionBiometrica.CANCELADA
        abrirDetalle()

        revocarConConfirmacion()

        compose.onNodeWithText("Canceló la confirmación. No se revocó la autorización.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_ERROR).assertDoesNotExist()
        coVerify(exactly = 0) { repositorio.revocar(any()) }
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `503 ofrece Reintentar y el reintento revoca (idempotente)`() {
        coEvery { repositorio.revocar("c-7") } returnsMany listOf(
            Resultado.Fallo(FalloConsentimiento.ServicioNoDisponible),
            Resultado.Exito(revocado),
        )
        abrirDetalle()

        revocarConConfirmacion()
        compose.onNodeWithText("No fue posible revocar la autorización").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").performClick()
        compose.waitForIdle()

        compose.onNodeWithText("Autorización revocada. Solventa ya no consultará sus datos con ella.").performScrollTo().assertIsDisplayed()
        coVerify(exactly = 2) { repositorio.revocar("c-7") }
    }

    @Test
    fun `sin conexion se informa y no cambia de estado`() {
        coEvery { repositorio.revocar("c-7") } returns Resultado.Fallo(FalloConsentimiento.SinConexion)
        abrirDetalle()

        revocarConConfirmacion()

        compose.onNodeWithText("No hay conexión. Revise su red e intente de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Cerrar").performClick()
        compose.waitForIdle()
        compose.onNodeWithText("ACTIVA").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `404 muestra el modal sin reintentar y al cerrarlo se actualiza el panel`() {
        coEvery { repositorio.revocar("c-7") } returns Resultado.Fallo(FalloConsentimiento.NoEncontrado)
        abrirDetalle()

        revocarConConfirmacion()
        compose.onNodeWithText("No encontramos esta autorización.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").assertDoesNotExist()
        compose.onNodeWithText("Cerrar").performClick()
        compose.waitForIdle()

        // Una vez al abrir (preparar) y otra al cerrar el modal.
        coVerify(exactly = 2) { repositorio.listar() }
    }

    @Test
    fun `sin uno vigente, una autorizacion anterior abre su comprobante con historial`() {
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(revocado))
        coEvery { repositorio.detalle("c-7") } returns Resultado.Exito(revocado)
        coEvery { repositorio.historial("c-7") } returns Resultado.Exito(
            Historial(
                "c-7",
                EstadoConsentimiento.REVOCADO,
                listOf(Hito(TipoHito.OTORGADO, activo.otorgadoEn), Hito(TipoHito.REVOCADO, revocado.revocadoEn!!)),
            ),
        )
        viewModel.cargarConsentimientos()
        abrirDetalle()

        compose.onNodeWithTag(EtiquetasPrueba.anterior("c-7")).performScrollTo().performClick()
        compose.waitForIdle()

        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertIsDisplayed()
        compose.onNodeWithText("Revocada: 2 de noviembre de 2026", substring = true).performScrollTo().assertIsDisplayed()
    }
}
