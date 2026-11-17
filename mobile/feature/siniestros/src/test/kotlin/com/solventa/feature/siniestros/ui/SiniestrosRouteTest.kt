package com.solventa.feature.siniestros.ui

import android.app.Application
import android.Manifest
import androidx.activity.compose.setContent
import androidx.activity.ComponentActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Resultado as ResultadoPolizas
import com.solventa.feature.billetera.dominio.Vigencia
import com.solventa.feature.siniestros.EtiquetasSiniestros
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.SiniestrosViewModel
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.Evidencia
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import io.mockk.mockk
import java.io.File
import java.math.BigDecimal
import java.time.LocalDate
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, qualifiers = "es-rCO-w411dp-h891dp")
class SiniestrosRouteTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private val contexto = RuntimeEnvironment.getApplication()
    private val repositorio = RepositorioFalso()
    private val polizas = PolizasFalsas()
    private val almacen = object : AlmacenEvidencias {
        override fun crearArchivo(extension: String) = File.createTempFile("captura-", ".$extension", contexto.cacheDir)
        override fun eliminar(archivo: File) {
            archivo.delete()
        }
    }
    private var viewModel: SiniestrosViewModel? = null

    @Test
    fun `formulario permite seleccionar poliza diligenciar descripcion y abrir explicacion del permiso`() {
        val actividad = montar()

        compose.onNodeWithTag(EtiquetasSiniestros.REPORTAR).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_nuevo_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_seleccionar_seguro)).performClick()
        compose.onNodeWithText("POL-01 · Auto").performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).performTextInput("Choque en la vía")
        compose.onNodeWithText(contexto.getString(R.string.siniestros_tomar_foto)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_permiso_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_cancelar)).performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `permiso concedido permite entrar a la camara`() {
        Shadows.shadowOf(contexto).grantPermissions(Manifest.permission.CAMERA)
        val actividad = montar()

        abrirFormulario()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_tomar_foto)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_permiso_continuar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_camara_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_volver)).performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `detalle muestra el estado y la evidencia del borrador seleccionado`() {
        repositorio.borradores = listOf(
            BorradorResumen("borrador-1", "poliza-1", "Choque", "ABIERTO", "2026-11-16T22:10:02-05:00", 1, 0),
        )
        repositorio.detalleActual = BorradorDetalle(
            id = "borrador-1",
            polizaId = "poliza-1",
            descripcion = "Choque",
            estado = "ABIERTO",
            creadoEn = "2026-11-16T22:10:02-05:00",
            cantidadEvidencias = 1,
            evidenciasPendientes = 0,
            evidencias = listOf(
                Evidencia("evidencia-1", "foto.jpg", TipoEvidencia.FOTOGRAFIA, "image/jpeg", 3, EstadoCarga.CARGADA, null, null),
                Evidencia("evidencia-2", "video.mp4", TipoEvidencia.VIDEO, "video/mp4", 8, EstadoCarga.PENDIENTE, null, 2),
            ),
        )
        val actividad = montar()

        compose.onNodeWithTag(EtiquetasSiniestros.borrador("borrador-1")).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_detalle_titulo)).assertIsDisplayed()
        compose.onNodeWithText("foto.jpg").assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_estado_carga_completada)).assertIsDisplayed()
        compose.onNodeWithText("video.mp4").assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_estado_carga_pendiente)).assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `error de carga en lista presenta accion de reintento`() {
        repositorio.falloCarga = FalloSiniestros.ServicioNoDisponible
        val actividad = montar()

        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_carga)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_reintentar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_carga)).assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `formulario informa descripcion obligatoria y permite cancelar el borrador local`() {
        val actividad = montar()
        abrirFormulario()
        seleccionarPoliza()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_reportar_ahora)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_descripcion)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_descartar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_confirmar_descartar)).performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.LISTA_VACIA).assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `detalle fallido permite volver a solicitar los datos`() {
        repositorio.borradores = listOf(
            BorradorResumen("borrador-1", "poliza-1", "Choque", "ABIERTO", "fecha", 0, 0),
        )
        repositorio.falloDetalle = FalloSiniestros.BorradorNoEncontrado
        val actividad = montar()

        compose.onNodeWithTag(EtiquetasSiniestros.borrador("borrador-1")).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_detalle)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_reintentar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_detalle)).assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `revisar evidencia temporal y eliminarla no abandona el formulario`() {
        val actividad = montar()
        val archivo = almacen.crearArchivo("jpg").apply { writeBytes(ByteArray(1536)) }
        viewModel?.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
        abrirFormulario()

        compose.onNodeWithText(contexto.getString(R.string.siniestros_capturas_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_tamano_archivo, archivo.name, "1 KiB")).assertIsDisplayed()
        compose.onNodeWithContentDescription(contexto.getString(R.string.siniestros_captura_eliminar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_capturas_titulo)).assertDoesNotExist()

        actividad.finish()
    }

    @Test
    fun `formulario presenta los mensajes de formato tamano duracion y cantidad`() {
        val actividad = montar()
        abrirFormulario()

        val tipoNoAdmitido = almacen.crearArchivo("bin").apply { writeBytes(byteArrayOf(1)) }
        viewModel?.agregarCaptura(tipoNoAdmitido, TipoEvidencia.DESCONOCIDO)
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_tipo))
            .performScrollTo()
            .assertIsDisplayed()

        val archivoGrande = almacen.crearArchivo("jpg").apply { writeBytes(ByteArray(10_241)) }
        viewModel?.agregarCaptura(archivoGrande, TipoEvidencia.FOTOGRAFIA)
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_tamano, "10 KiB", "20 KiB"))
            .performScrollTo()
            .assertIsDisplayed()

        val videoLargo = almacen.crearArchivo("mp4").apply { writeBytes(byteArrayOf(1)) }
        viewModel?.agregarCaptura(videoLargo, TipoEvidencia.VIDEO, 61)
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_duracion, 60))
            .performScrollTo()
            .assertIsDisplayed()

        repeat(10) {
            val evidencia = almacen.crearArchivo("jpg").apply { writeBytes(byteArrayOf(1)) }
            viewModel?.agregarCaptura(evidencia, TipoEvidencia.FOTOGRAFIA)
        }
        val excedente = almacen.crearArchivo("jpg").apply { writeBytes(byteArrayOf(1)) }
        viewModel?.agregarCaptura(excedente, TipoEvidencia.FOTOGRAFIA)
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_cantidad, 10))
            .performScrollTo()
            .assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `pantalla de permiso denegado informa y expone acciones`() {
        var ajustesAbiertos = false
        var regresoSolicitado = false
        val actividad = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        actividad.setContent {
            MaterialTheme {
                PermisoDenegadoScreen(
                    alAbrirAjustes = { ajustesAbiertos = true },
                    alVolver = { regresoSolicitado = true },
                )
            }
        }
        compose.waitForIdle()

        compose.onNodeWithText(contexto.getString(R.string.siniestros_permiso_denegado_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_abrir_ajustes)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_volver)).performClick()

        org.junit.Assert.assertTrue(ajustesAbiertos)
        org.junit.Assert.assertTrue(regresoSolicitado)
        actividad.finish()
    }

    @Test
    fun `mapea cada fallo del servicio a un mensaje entendible`() {
        val limites = LimitesSiniestros(10, listOf("image/jpeg"), listOf("video/mp4"), 10_240, 20_480, 60, 300)
        val casos = listOf(
            FalloSiniestros.SinConexion to R.string.siniestros_error_red,
            FalloSiniestros.SesionVencida to R.string.siniestros_error_sesion,
            FalloSiniestros.NoAutorizado to R.string.siniestros_error_no_autorizado,
            FalloSiniestros.PolizaNoAutorizada to R.string.siniestros_error_no_autorizado,
            FalloSiniestros.PolizaNoEncontrada to R.string.siniestros_error_poliza,
            FalloSiniestros.PolizaNoVigente to R.string.siniestros_error_poliza,
            FalloSiniestros.BorradorNoEncontrado to R.string.siniestros_error_generico,
            FalloSiniestros.SolicitudInvalida to R.string.siniestros_error_generico,
            FalloSiniestros.IdempotenciaConflicto to R.string.siniestros_error_idempotencia,
            FalloSiniestros.TipoEvidenciaNoAdmitido to R.string.siniestros_error_tipo,
            FalloSiniestros.TamanoEvidenciaExcedido to R.string.siniestros_error_tamano,
            FalloSiniestros.DuracionVideoExcedida to R.string.siniestros_error_duracion,
            FalloSiniestros.LimiteEvidenciasAlcanzado to R.string.siniestros_error_cantidad,
            FalloSiniestros.IntegridadEvidenciaInvalida to R.string.siniestros_error_integridad,
            FalloSiniestros.ServicioNoDisponible to R.string.siniestros_error_generico,
            FalloSiniestros.CargaS3Fallida to R.string.siniestros_error_subida,
            FalloSiniestros.RespuestaInvalida to R.string.siniestros_error_generico,
            FalloSiniestros.DescripcionObligatoria to R.string.siniestros_error_descripcion,
            FalloSiniestros.DescripcionDemasiadoLarga to R.string.siniestros_error_descripcion_larga,
            FalloSiniestros.EvidenciaNoAdmitida to R.string.siniestros_error_tipo,
            FalloSiniestros.ArchivoNoDisponible to R.string.siniestros_error_captura,
        )
        val fallo = mutableStateOf(casos.first().first)
        val limitesActuales = mutableStateOf<LimitesSiniestros?>(limites)
        val actividad = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        actividad.setContent {
            MaterialTheme {
                ErrorSiniestros(fallo.value, limitesActuales.value)
            }
        }
        compose.waitForIdle()

        casos.forEach { (causa, textoId) ->
            compose.runOnIdle { fallo.value = causa }
            val texto = when (causa) {
                FalloSiniestros.TamanoEvidenciaExcedido ->
                    contexto.getString(textoId, "10 KiB", "20 KiB")
                FalloSiniestros.DuracionVideoExcedida -> contexto.getString(textoId, 60)
                FalloSiniestros.LimiteEvidenciasAlcanzado -> contexto.getString(textoId, 10)
                else -> contexto.getString(textoId)
            }
            compose.onNodeWithText(texto).assertIsDisplayed()
        }

        val limitesAusentes = listOf(
            FalloSiniestros.TamanoEvidenciaExcedido to
                contexto.getString(R.string.siniestros_error_tamano, "0 B", "0 B"),
            FalloSiniestros.DuracionVideoExcedida to contexto.getString(R.string.siniestros_error_duracion, 0),
            FalloSiniestros.LimiteEvidenciasAlcanzado to contexto.getString(R.string.siniestros_error_cantidad, 0),
        )
        limitesAusentes.forEach { (causa, texto) ->
            compose.runOnIdle {
                fallo.value = causa
                limitesActuales.value = null
            }
            compose.onNodeWithText(texto).assertIsDisplayed()
        }

        actividad.finish()
    }

    private fun abrirFormulario() {
        compose.onNodeWithTag(EtiquetasSiniestros.REPORTAR).performClick()
        compose.waitForIdle()
    }

    private fun seleccionarPoliza() {
        compose.onNodeWithText(contexto.getString(R.string.siniestros_seleccionar_seguro)).performClick()
        compose.onNodeWithText("POL-01 · Auto").performClick()
    }

    private fun montar(): ComponentActivity {
        val actividad = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        val viewModel = SiniestrosViewModel(
            repositorio,
            polizas,
            almacen,
            mockk<GestorSesion>(relaxed = true),
        )
        this.viewModel = viewModel
        actividad.setContent {
            MaterialTheme {
                SiniestrosRoute(viewModel, onIrALogin = {})
            }
        }
        compose.waitForIdle()
        return actividad
    }

    private class RepositorioFalso : RepositorioSiniestros {
        var borradores = emptyList<BorradorResumen>()
        var falloCarga: FalloSiniestros? = null
        var falloDetalle: FalloSiniestros? = null
        var detalleActual = BorradorDetalle(
            "borrador-1",
            "poliza-1",
            "Choque",
            "ABIERTO",
            "2026-11-16T22:10:02-05:00",
            0,
            0,
            emptyList(),
        )

        override suspend fun limites() = falloCarga?.let { Resultado.Fallo(it) } ?: Resultado.Exito(
            LimitesSiniestros(10, listOf("image/jpeg"), listOf("video/mp4"), 10_240, 20_480, 60, 300),
        )

        override suspend fun listar() = Resultado.Exito(borradores)

        override suspend fun detalle(borradorId: String) =
            falloDetalle?.let { Resultado.Fallo(it) } ?: Resultado.Exito(detalleActual)

        override suspend fun crearBorrador(polizaId: String, descripcion: String, claveIdempotencia: String) =
            Resultado.Fallo(com.solventa.feature.siniestros.dominio.FalloSiniestros.RespuestaInvalida)

        override suspend fun agregarEvidencia(
            borradorId: String,
            evidencia: com.solventa.feature.siniestros.dominio.EvidenciaTemporal,
            limites: LimitesSiniestros,
        ) = Resultado.Fallo(com.solventa.feature.siniestros.dominio.FalloSiniestros.RespuestaInvalida)
    }

    private class PolizasFalsas : RepositorioPolizas {
        override suspend fun listar() = ResultadoPolizas.Exito(
            listOf(
                PolizaResumen(
                    "poliza-1",
                    "POL-01",
                    "EMITIDA",
                    "Auto",
                    "Vehículos",
                    Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31")),
                    true,
                    ResumenCobertura(BigDecimal.ZERO, "COP", 1),
                ),
            ),
        )

        override suspend fun detalle(polizaId: String) =
            ResultadoPolizas.Fallo(com.solventa.feature.billetera.dominio.FalloPolizas.ErrorGenerico)
    }
}
