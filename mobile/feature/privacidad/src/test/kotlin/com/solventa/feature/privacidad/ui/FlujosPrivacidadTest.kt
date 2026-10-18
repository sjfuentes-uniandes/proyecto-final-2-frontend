package com.solventa.feature.privacidad.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.solventa.feature.privacidad.EstadoOtorgamiento
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.PrivacidadViewModel
import com.solventa.feature.privacidad.casos.ListarConsentimientos
import com.solventa.feature.privacidad.casos.ObtenerTextoVigente
import com.solventa.feature.privacidad.casos.OtorgarConsentimiento
import com.solventa.feature.privacidad.casos.RevocarConsentimiento
import com.solventa.feature.privacidad.casos.VerDetalleConsentimiento
import com.solventa.feature.privacidad.casos.VerHistorialConsentimiento
import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Hito
import com.solventa.feature.privacidad.dominio.Otorgamiento
import com.solventa.feature.privacidad.dominio.Permiso
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
 * Flujos de las Routes con el ViewModel y los casos de uso reales; solo el repositorio (red) y
 * la biometría son dobles. Comprueba lo que la UI decide: comprobante, aviso o modal.
 */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO")
class FlujosPrivacidadTest {
    @get:Rule
    val compose = createComposeRule()

    private val repositorio = mockk<RepositorioConsentimientos>()
    private var confirmaciones = ArrayDeque<ConfirmacionBiometrica>()
    private val verificador = VerificadorBiometrico { confirmaciones.removeFirstOrNull() ?: ConfirmacionBiometrica.CONFIRMADA }
    private lateinit var viewModel: PrivacidadViewModel
    private val volver = IntArray(1)

    private val consentimiento = Consentimiento(
        id = "c-9",
        estado = EstadoConsentimiento.ACTIVO,
        proposito = "PERFILAMIENTO_PRECIO",
        alcances = listOf("FA_PRODUCTOS_VIGENTES"),
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
        otorgadoEn = Instant.parse("2026-10-17T15:00:00Z"),
        vigenteHasta = Instant.parse("2027-10-17T23:59:59Z"),
        revocadoEn = null,
    )
    private val texto = TextoVigente("PERFILAMIENTO_PRECIO", "es-CO", "2026-10-17.1", "Título", "Cuerpo", "Aviso", listOf(6, 12), 12)

    @Before
    fun preparar() {
        coEvery { repositorio.listar() } returns Resultado.Exito(emptyList())
        coEvery { repositorio.textoVigente(any(), any()) } returns Resultado.Exito(texto)
        // El comprobante pide su historial (HU-M09).
        coEvery { repositorio.historial(any()) } answers {
            Resultado.Exito(Historial(firstArg(), EstadoConsentimiento.ACTIVO, listOf(Hito(TipoHito.OTORGADO, consentimiento.otorgadoEn))))
        }
        viewModel = PrivacidadViewModel(
            ListarConsentimientos(repositorio),
            VerDetalleConsentimiento(repositorio),
            ObtenerTextoVigente(repositorio),
            OtorgarConsentimiento(repositorio, verificador),
            RevocarConsentimiento(repositorio, verificador),
            VerHistorialConsentimiento(repositorio),
        )
    }

    private fun abrirPermiso() {
        compose.setContent { PermisoOpenFinanceRoute(viewModel, onVolver = { volver[0]++ }) }
    }

    private fun confirmarFormulario() {
        compose.onNodeWithTag(EtiquetasPrueba.alcance(Alcance.FA_PRODUCTOS_VIGENTES.name)).performScrollTo().performClick()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_OTORGAR).performScrollTo().performClick()
        compose.waitForIdle()
    }

    @Test
    fun `sin consentimiento activo pide el texto vigente en el idioma de la app`() {
        abrirPermiso()

        compose.onNodeWithText("Título").assertIsDisplayed()
        coVerify { repositorio.textoVigente("PERFILAMIENTO_PRECIO", "es-CO") }
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `en ingles pide el texto en en-US`() {
        abrirPermiso()
        compose.waitForIdle()

        coVerify { repositorio.textoVigente("PERFILAMIENTO_PRECIO", "en-US") }
    }

    @Test
    fun `otorgar muestra el comprobante y el aviso de exito (AC1)`() {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(consentimiento, repeticion = false))
        abrirPermiso()

        confirmarFormulario()

        compose.onNodeWithText("Autorización otorgada. Este es su comprobante.").assertExists()
        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertExists()
    }

    @Test
    fun `una repeticion de la misma clave se informa como ya otorgada (AC4)`() {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(consentimiento, repeticion = true))
        abrirPermiso()

        confirmarFormulario()

        compose.onNodeWithText("Esta autorización ya está otorgada.").assertExists()
    }

    @Test
    fun `cancelar la biometria no llama al servidor ni abre el modal (AC2)`() {
        confirmaciones += ConfirmacionBiometrica.CANCELADA
        abrirPermiso()

        confirmarFormulario()

        compose.onNodeWithText("Canceló la confirmación. No se otorgó la autorización.").assertExists()
        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_ERROR).assertDoesNotExist()
        coVerify(exactly = 0) { repositorio.otorgar(any(), any()) }
        assertEquals(EstadoOtorgamiento.Inactivo, viewModel.uiState.value.otorgamiento)
    }

    @Test
    fun `un 409 ya vigente no es error, lleva al comprobante de ese consentimiento`() {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Fallo(FalloConsentimiento.YaVigente("c-9"))
        coEvery { repositorio.detalle("c-9") } returns Resultado.Exito(consentimiento)
        abrirPermiso()

        confirmarFormulario()

        compose.onNodeWithText("Esta autorización ya está otorgada.").assertExists()
        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertExists()
        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_ERROR).assertDoesNotExist()
        coVerify { repositorio.detalle("c-9") }
    }

    @Test
    fun `un 409 sin identificador se informa en el modal`() {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Fallo(FalloConsentimiento.YaVigente(null))
        abrirPermiso()

        confirmarFormulario()

        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_ERROR).assertExists()
        compose.onNodeWithText("Esta autorización ya está otorgada.").assertExists()
    }

    @Test
    fun `reintentar desde el modal repite el mismo intento`() {
        coEvery { repositorio.otorgar(any(), any()) } returnsMany listOf(
            Resultado.Fallo(FalloConsentimiento.ServicioNoDisponible),
            Resultado.Exito(Otorgamiento(consentimiento, repeticion = true)),
        )
        abrirPermiso()
        confirmarFormulario()

        compose.onNodeWithText("El servicio no está disponible en este momento. Intente de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").performClick()
        compose.waitForIdle()

        val claves = mutableListOf<String>()
        coVerify(exactly = 2) { repositorio.otorgar(any(), capture(claves)) }
        assertEquals(1, claves.distinct().size)
        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertExists()
    }

    @Test
    fun `si el texto cambio, al cerrar el modal se vuelve a mostrar el vigente`() {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Fallo(FalloConsentimiento.TextoNoVigente)
        abrirPermiso()
        confirmarFormulario()

        compose.onNodeWithText("Cerrar").performClick()
        compose.waitForIdle()

        coVerify(exactly = 2) { repositorio.textoVigente(any(), any()) }
        compose.onNodeWithTag(EtiquetasPrueba.DIALOGO_ERROR).assertDoesNotExist()
    }

    @Test
    fun `con un consentimiento activo en la lista se abre su comprobante`() {
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(consentimiento))
        coEvery { repositorio.detalle("c-9") } returns Resultado.Exito(consentimiento)
        viewModel.cargarConsentimientos()
        compose.waitForIdle()

        abrirPermiso()

        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertExists()
        coVerify(exactly = 0) { repositorio.textoVigente(any(), any()) }
    }

    @Test
    fun `si el comprobante no carga se puede reintentar`() {
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(consentimiento))
        coEvery { repositorio.detalle("c-9") } returnsMany listOf(
            Resultado.Fallo(FalloConsentimiento.SinConexion),
            Resultado.Exito(consentimiento),
        )
        viewModel.cargarConsentimientos()
        compose.waitForIdle()
        abrirPermiso()

        compose.onNodeWithText("Reintentar").performClick()
        compose.waitForIdle()

        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertExists()
    }

    @Test
    fun `si el texto vigente no carga se puede reintentar`() {
        coEvery { repositorio.textoVigente(any(), any()) } returnsMany listOf(
            Resultado.Fallo(FalloConsentimiento.ServicioNoDisponible),
            Resultado.Exito(texto),
        )
        abrirPermiso()

        compose.onNodeWithText("Reintentar").performClick()
        compose.waitForIdle()

        compose.onNodeWithText("Título").assertIsDisplayed()
    }

    @Test
    fun `volver descarta el resultado y regresa`() {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Fallo(FalloConsentimiento.VigenciaInvalida)
        abrirPermiso()
        confirmarFormulario()
        compose.onNodeWithText("Cerrar").performClick()

        compose.onNode(hasContentDescription("Volver")).performClick()

        assertEquals(1, volver[0])
        assertEquals(EstadoOtorgamiento.Inactivo, viewModel.uiState.value.otorgamiento)
    }

    @Test
    fun `la lista se carga al entrar y solo abre los permisos soportados`() {
        val abiertos = mutableListOf<Permiso>()
        compose.setContent { PrivacidadListaRoute(viewModel, onAbrirPermiso = { abiertos += it }) }

        compose.onNodeWithTag(EtiquetasPrueba.permiso(Permiso.BIOMETRICOS_IDENTIDAD.name)).performClick()
        compose.onNodeWithTag(EtiquetasPrueba.permiso(Permiso.OPEN_FINANCE_OPEN_DATA.name)).performClick()

        coVerify { repositorio.listar() }
        assertEquals(listOf(Permiso.OPEN_FINANCE_OPEN_DATA), abiertos)
    }
}
