package com.solventa.feature.privacidad.ui

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.solventa.feature.privacidad.Carga
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.TextoVigente
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Estados visuales de las pantallas de Privacidad, en la JVM (Robolectric), en es-CO salvo que se indique. */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO")
class PantallasPrivacidadTest {
    @get:Rule
    val compose = createComposeRule()

    private val consentimiento = Consentimiento(
        id = "c-1",
        estado = EstadoConsentimiento.ACTIVO,
        proposito = "PERFILAMIENTO_PRECIO",
        alcances = listOf("FA_PRODUCTOS_VIGENTES", "FA_NUEVO_DE_N_MAS_1"),
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
        otorgadoEn = Instant.parse("2026-10-17T15:00:00Z"),
        vigenteHasta = Instant.parse("2027-10-17T23:59:59Z"),
        revocadoEn = null,
    )
    private val texto = TextoVigente(
        proposito = "PERFILAMIENTO_PRECIO",
        idioma = "es-CO",
        versionTexto = "2026-10-17.1",
        titulo = "Autorización de ejemplo",
        cuerpo = "Texto ilustrativo del consentimiento.",
        aviso = "Texto de ejemplo, sin validez legal",
        vigenciasMeses = listOf(6, 12),
        vigenciaDefectoMeses = 12,
    )

    private fun estado(texto: String) = SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, texto)

    // --- Lista de permisos -------------------------------------------------------------------

    private fun lista(carga: Carga<List<Consentimiento>>, abiertos: MutableList<Permiso> = mutableListOf(), reintentos: IntArray = IntArray(1)) {
        compose.setContent {
            ListaPermisosScreen(
                permisos = Permiso.entries,
                consentimientos = carga,
                onAbrirPermiso = { abiertos += it },
                onReintentar = { reintentos[0]++ },
            )
        }
    }

    @Test
    fun `cargando muestra un indicador que el lector anuncia`() {
        lista(Carga.Cargando)

        compose.onNodeWithTag(EtiquetasPrueba.CARGANDO).assert(hasContentDescription("Cargando…")).assertIsDisplayed()
        compose.onNodeWithText("Permisos para el uso de datos personales").assertIsDisplayed()
    }

    @Test
    fun `sin consentimientos Open Finance figura sin otorgar y se puede abrir`() {
        val abiertos = mutableListOf<Permiso>()
        lista(Carga.Lista(emptyList()), abiertos)

        compose.onNodeWithTag(EtiquetasPrueba.permiso(Permiso.OPEN_FINANCE_OPEN_DATA.name))
            .assert(estado("Estado: SIN OTORGAR"))
            .assertIsEnabled()
            .performClick()

        assertEquals(listOf(Permiso.OPEN_FINANCE_OPEN_DATA), abiertos)
    }

    @Test
    fun `con datos la etiqueta muestra el estado del mas reciente con texto, no solo color`() {
        lista(Carga.Lista(listOf(consentimiento, consentimiento.copy(estado = EstadoConsentimiento.REVOCADO))))

        compose.onNodeWithTag(EtiquetasPrueba.permiso(Permiso.OPEN_FINANCE_OPEN_DATA.name)).assert(estado("Estado: ACTIVA"))
        // La etiqueta visual no se anuncia por separado: el lector la oye una vez, en la tarjeta.
        compose.onNodeWithText("ACTIVA").assertDoesNotExist()
    }

    @Test
    fun `los permisos no soportados se ven deshabilitados, con su motivo, y no abren nada (ADR 0001)`() {
        val abiertos = mutableListOf<Permiso>()
        lista(Carga.Lista(emptyList()), abiertos)

        listOf(Permiso.DATOS_PERSONALES_FINANCIEROS, Permiso.BIOMETRICOS_IDENTIDAD).forEach { permiso ->
            compose.onNodeWithTag(EtiquetasPrueba.permiso(permiso.name))
                .assertIsNotEnabled()
                .assert(estado("Estado: NO DISPONIBLE"))
                .assert(hasText("No disponible en esta versión", substring = true))
                .performClick()
        }
        assertTrue(abiertos.isEmpty())
    }

    @Test
    fun `un error de carga se anuncia y permite reintentar`() {
        val reintentos = IntArray(1)
        lista(Carga.Error(FalloConsentimiento.SinConexion), reintentos = reintentos)

        compose.onNodeWithText("No fue posible cargar la información.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").assertHeightIsAtLeast(48.dp).performClick()
        assertEquals(1, reintentos[0])
    }

    @Test
    fun `las tarjetas de permiso tienen al menos 48 dp de area tactil`() {
        lista(Carga.Lista(emptyList()))

        Permiso.entries.forEach {
            compose.onNodeWithTag(EtiquetasPrueba.permiso(it.name)).assertHeightIsAtLeast(48.dp)
        }
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `en ingles la lista usa values-en-rUS`() {
        lista(Carga.Lista(emptyList()))

        compose.onNodeWithText("Permissions to use personal data").assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.permiso(Permiso.OPEN_FINANCE_OPEN_DATA.name)).assert(estado("Status: NOT GRANTED"))
    }

    // --- Permiso Open Finance ------------------------------------------------------------------

    private fun permiso(
        vista: VistaPermiso,
        aviso: AvisoPermiso? = null,
        fallo: FalloConsentimiento? = null,
        solicitudes: MutableList<SolicitudOtorgamiento> = mutableListOf(),
        eventos: MutableList<String> = mutableListOf(),
    ) {
        compose.setContent {
            PermisoOpenFinanceScreen(
                vista = vista,
                aviso = aviso,
                falloOtorgar = fallo,
                onVolver = { eventos += "volver" },
                onOtorgar = { solicitudes += it },
                onReintentarOtorgar = { eventos += "reintentar" },
                onCerrarError = { eventos += "cerrar" },
            )
        }
    }

    @Test
    fun `el texto vigente se ve antes de confirmar y otorgar exige al menos un dato (AC1)`() {
        val solicitudes = mutableListOf<SolicitudOtorgamiento>()
        permiso(VistaPermiso.Formulario(texto, enCurso = false), solicitudes = solicitudes)

        compose.onNodeWithText("Autorización de ejemplo").assertIsDisplayed()
        compose.onNodeWithText("Texto de ejemplo, sin validez legal").assertExists()
        compose.onNodeWithText("Versión del texto: 2026-10-17.1", substring = true).assertExists()
        compose.onNodeWithTag(EtiquetasPrueba.vigencia(12)).assertIsSelected()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_OTORGAR).assertIsNotEnabled()

        compose.onNodeWithTag(EtiquetasPrueba.alcance(Alcance.DA_REGISTROS_PUBLICOS.name)).performScrollTo().performClick().assertIsOn()
        compose.onNodeWithTag(EtiquetasPrueba.alcance(Alcance.FA_PRODUCTOS_VIGENTES.name)).performScrollTo().performClick()
        compose.onNodeWithTag(EtiquetasPrueba.alcance(Alcance.FA_HISTORIAL_PAGOS_12M.name)).assertIsOff()
        compose.onNodeWithTag(EtiquetasPrueba.vigencia(6)).performScrollTo().performClick().assertIsSelected()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_OTORGAR).performScrollTo().assertIsEnabled().performClick()

        assertEquals(
            listOf(
                SolicitudOtorgamiento(
                    permiso = Permiso.OPEN_FINANCE_OPEN_DATA,
                    alcances = setOf(Alcance.FA_PRODUCTOS_VIGENTES, Alcance.DA_REGISTROS_PUBLICOS),
                    vigenciaMeses = 6,
                    versionTexto = "2026-10-17.1",
                    idioma = "es-CO",
                ),
            ),
            solicitudes,
        )
    }

    @Test
    fun `los controles del formulario tienen al menos 48 dp`() {
        permiso(VistaPermiso.Formulario(texto, enCurso = false))

        Alcance.entries.forEach { compose.onNodeWithTag(EtiquetasPrueba.alcance(it.name)).assertHeightIsAtLeast(48.dp) }
        listOf(6, 12).forEach { compose.onNodeWithTag(EtiquetasPrueba.vigencia(it)).assertHeightIsAtLeast(48.dp) }
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_OTORGAR).assertHeightIsAtLeast(48.dp)
        compose.onNode(hasContentDescription("Volver")).assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun `con la fuente al 200 por ciento el formulario sigue completo y usable`() {
        val solicitudes = mutableListOf<SolicitudOtorgamiento>()
        compose.setContent {
            val densidad = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(densidad.density, fontScale = 2f)) {
                PermisoOpenFinanceScreen(
                    vista = VistaPermiso.Formulario(texto, enCurso = false),
                    aviso = null,
                    falloOtorgar = null,
                    onVolver = {},
                    onOtorgar = { solicitudes += it },
                    onReintentarOtorgar = {},
                    onCerrarError = {},
                )
            }
        }

        compose.onNodeWithTag(EtiquetasPrueba.alcance(Alcance.FA_INGRESOS_AGREGADOS.name)).performScrollTo().performClick()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_OTORGAR).performScrollTo().assertIsDisplayed().performClick()

        assertEquals(setOf(Alcance.FA_INGRESOS_AGREGADOS), solicitudes.single().alcances)
    }

    @Test
    fun `mientras otorga el boton anuncia que esta en curso y no se puede repetir`() {
        permiso(VistaPermiso.Formulario(texto, enCurso = true))

        compose.onNodeWithTag(EtiquetasPrueba.BOTON_OTORGAR).assertIsNotEnabled().assert(hasText("OTORGANDO…"))
        compose.onNodeWithTag(EtiquetasPrueba.alcance(Alcance.FA_PRODUCTOS_VIGENTES.name)).assertIsNotEnabled()
    }

    @Test
    fun `otorgado muestra el comprobante con secciones, vencimiento y version (AC1, AC6)`() {
        permiso(VistaPermiso.Comprobante(consentimiento), aviso = AvisoPermiso.OTORGADA)

        compose.onNodeWithText("Autorización otorgada. Este es su comprobante.").assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertExists()
        listOf("PROPÓSITO", "DATOS SOLICITADOS", "VIGENCIA").forEach { compose.onNodeWithText(it).assertExists() }
        compose.onNodeWithText("Productos financieros vigentes").assertExists()
        // Un alcance que esta versión no conoce se muestra con su código.
        compose.onNodeWithText("FA_NUEVO_DE_N_MAS_1").assertExists()
        compose.onNodeWithText("Vencimiento:", substring = true).assertExists()
        compose.onNodeWithText("Versión del texto: 2026-10-17.1").assertExists()
        // HU-M09: un consentimiento ACTIVO ofrece revocar (mockup_1_HUM09.png).
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun `un comprobante revocado muestra la fecha de revocacion`() {
        permiso(VistaPermiso.Comprobante(consentimiento.copy(estado = EstadoConsentimiento.REVOCADO, revocadoEn = Instant.parse("2026-11-01T10:00:00Z"))))

        compose.onNodeWithText("Revocado:", substring = true).assertExists()
        compose.onNodeWithText("REVOCADA").assertExists()
    }

    @Test
    fun `un error de carga en el detalle permite reintentar`() {
        val reintentos = IntArray(1)
        permiso(VistaPermiso.ErrorCarga { reintentos[0]++ })
        compose.onNodeWithText("Reintentar").performClick()
        assertEquals(1, reintentos[0])
    }

    @Test
    fun `cargando en el detalle muestra el indicador`() {
        permiso(VistaPermiso.Cargando)
        compose.onNodeWithTag(EtiquetasPrueba.CARGANDO).assertExists()
    }

    @Test
    fun `el modal de error dice que no fue posible otorgar y el motivo por codigo (AC6)`() {
        val eventos = mutableListOf<String>()
        permiso(VistaPermiso.Formulario(texto, false), fallo = FalloConsentimiento.VigenciaInvalida, eventos = eventos)

        compose.onNodeWithText("No fue posible otorgar autorización").assertIsDisplayed()
        compose.onNodeWithText("No es posible otorgar autorización sin una vigencia válida.").assertIsDisplayed()
        // Un rechazo definitivo no ofrece reintentar.
        compose.onNodeWithText("Reintentar").assertDoesNotExist()
        compose.onNodeWithText("Cerrar").performClick()
        assertEquals(listOf("cerrar"), eventos)
    }

    @Test
    fun `un fallo reintentable ofrece reintentar`() {
        val eventos = mutableListOf<String>()
        permiso(VistaPermiso.Formulario(texto, false), fallo = FalloConsentimiento.SinConexion, eventos = eventos)

        compose.onNodeWithText("No hay conexión. Revise su red e intente de nuevo.").assertIsDisplayed()
        compose.onNodeWithText("Reintentar").assertHeightIsAtLeast(48.dp).performClick()
        assertEquals(listOf("reintentar"), eventos)
    }

    @Test
    fun `una solicitud invalida explica que informacion completar (AC3)`() {
        permiso(
            VistaPermiso.Formulario(texto, false),
            fallo = FalloConsentimiento.SolicitudInvalida(listOf("alcances", "vigenciaMeses", "campoNuevo")),
        )

        compose.onNodeWithText("Complete la información solicitada: datos solicitados, vigencia.").assertIsDisplayed()
    }

    @Test
    fun `una solicitud invalida sin campos conocidos usa el mensaje general`() {
        permiso(VistaPermiso.Formulario(texto, false), fallo = FalloConsentimiento.SolicitudInvalida(emptyList()))

        compose.onNodeWithText("Complete la información solicitada.").assertIsDisplayed()
    }

    @Test
    fun `la biometria no disponible se explica en el modal`() {
        permiso(
            VistaPermiso.Formulario(texto, false),
            fallo = FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.NO_DISPONIBLE),
        )

        compose.onNodeWithText("Para otorgar la autorización debe configurar la huella o el rostro en su dispositivo.")
            .assertIsDisplayed()
    }

    @Test
    fun `volver llama a su accion`() {
        val eventos = mutableListOf<String>()
        permiso(VistaPermiso.Cargando, eventos = eventos)

        compose.onNode(hasContentDescription("Volver")).performClick()
        assertEquals(listOf("volver"), eventos)
    }
}
