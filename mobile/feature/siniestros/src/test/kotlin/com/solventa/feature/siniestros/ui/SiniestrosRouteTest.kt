package com.solventa.feature.siniestros.ui

import android.app.Application
import android.Manifest
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.activity.compose.setContent
import androidx.activity.ComponentActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTextReplacement
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Resultado as ResultadoPolizas
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.Vigencia
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.siniestros.dominio.EnvioSiniestro
import com.solventa.feature.siniestros.dominio.PaginaSiniestros
import com.solventa.feature.siniestros.dominio.SiniestroDetalle
import com.solventa.feature.siniestros.dominio.SiniestroResumen
import io.mockk.every
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import com.solventa.feature.siniestros.EtiquetasSiniestros
import com.solventa.feature.siniestros.AlmacenPendientesFalso
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.SiniestrosViewModel
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.Evidencia
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.ImportadorEvidencias
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.ArchivoEvidencia
import com.solventa.feature.siniestros.dominio.EvidenciaReporte
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import com.solventa.feature.siniestros.dominio.CapturaUbicacion
import com.solventa.feature.siniestros.dominio.EstadoUbicacion
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.ProveedorUbicacion
import com.solventa.feature.siniestros.dominio.ReglasUbicacion
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import com.solventa.feature.siniestros.dominio.UbicacionReporte
import io.mockk.mockk
import io.mockk.coEvery
import java.io.File
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import org.junit.Rule
import org.junit.Test
import org.junit.After
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
    private var actividadMontada: ComponentActivity? = null

    @Test
    fun `formulario permite seleccionar poliza diligenciar descripcion y abrir explicacion del permiso`() {
        val actividad = montar()

        compose.onNodeWithTag(EtiquetasSiniestros.REPORTAR).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_nuevo_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_seleccionar_seguro)).performClick()
        compose.onNodeWithText("POL-VENCIDA · Auto").assertDoesNotExist()
        compose.onNodeWithText("POL-01 · Auto").performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_descripcion_obligatoria)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).performTextInput("Choque en la vía")
        compose.onNodeWithText(contexto.getString(R.string.siniestros_tomar_foto)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_permiso_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_cancelar)).performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).assertIsDisplayed()

        actividad.finish()
    }

    @Test
    fun `selector permite cualquier archivo y muestra rechazo sin agregarlo`() {
        val importador = mockk<ImportadorEvidencias>()
        coEvery { importador.importar(any(), any()) } returns Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
        val actividad = montar(importador = importador)
        abrirFormulario()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_adjuntar_archivo)).performScrollTo().performClick()
        val solicitud = Shadows.shadowOf(actividad).nextStartedActivityForResult
        org.junit.Assert.assertEquals(Intent.ACTION_OPEN_DOCUMENT, solicitud.intent.action)
        org.junit.Assert.assertEquals("*/*", solicitud.intent.type)
        compose.runOnUiThread {
            Shadows.shadowOf(actividad).receiveResult(solicitud.intent, android.app.Activity.RESULT_CANCELED, null)
        }
        compose.waitForIdle()
        org.junit.Assert.assertTrue(viewModel!!.uiState.value.evidencias.isEmpty())
        org.junit.Assert.assertNull(viewModel!!.uiState.value.falloFormulario)
        compose.onNodeWithText(contexto.getString(R.string.siniestros_adjuntar_archivo)).performScrollTo().performClick()
        val segundaSolicitud = Shadows.shadowOf(actividad).nextStartedActivityForResult
        compose.runOnUiThread {
            Shadows.shadowOf(actividad).receiveResult(
                segundaSolicitud.intent, android.app.Activity.RESULT_OK, Intent().setData(Uri.parse("content://prueba/documento.pdf")),
            )
        }
        compose.waitForIdle()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_tipo)).performScrollTo().assertIsDisplayed()
        org.junit.Assert.assertTrue(viewModel!!.uiState.value.evidencias.isEmpty())
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `sin conexion muestra que el reporte quedo pendiente en el telefono`() {
        repositorio.reglas = ReglasUbicacion(false, emptyList(), 100.0)
        repositorio.falloCreacion = FalloSiniestros.SinConexion
        val pendientes = AlmacenPendientesFalso()
        val actividad = montar(pendientes = pendientes)
        abrirFormulario()
        seleccionarPoliza()
        compose.onNodeWithTag(EtiquetasSiniestros.CAUSA).performScrollTo().performClick()
        compose.onNodeWithText("Danos (DANOS)").performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).performScrollTo().performTextInput("Reporte de prueba")
        compose.runOnUiThread {
            val archivo = almacen.crearArchivo("jpg").apply { writeBytes(byteArrayOf(1)) }
            viewModel!!.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
        }
        compose.waitForIdle()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsEnabled().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendiente_local_guardado)).performScrollTo().assertIsDisplayed()
        org.junit.Assert.assertEquals(1, pendientes.guardados.size)
        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendiente_local_volver)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendientes)).performClick()
        compose.onNodeWithText("Reporte de prueba").assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendiente_local_estado)).assertIsDisplayed()
        compose.waitForIdle()
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `adjuntar sigue disponible al llegar al maximo e informa el limite`() {
        val actividad = montar(importador = mockk())
        abrirFormulario()
        compose.runOnUiThread {
            repeat(10) {
                val archivo = almacen.crearArchivo("jpg").apply { writeBytes(byteArrayOf(1)) }
                viewModel!!.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
            }
        }
        compose.waitForIdle()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_adjuntar_archivo)).performScrollTo().assertIsEnabled().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_cantidad, 10)).performScrollTo().assertIsDisplayed()
        compose.runOnUiThread { viewModel!!.cancelarFormulario() }
        compose.waitForIdle()
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `selector guarda codigo de cobertura y fecha explicita independiente de descripcion`() {
        val actividad = montar()
        abrirFormulario()
        seleccionarPoliza()
        org.junit.Assert.assertEquals("2026-11-18T13:00:00-05:00", viewModel?.uiState?.value?.fechaEvento)
        compose.onNodeWithTag(EtiquetasSiniestros.CAUSA).performScrollTo().performClick()
        compose.onNodeWithText("Danos (DANOS)").performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.FECHA_EVENTO).performScrollTo().performTextReplacement("2026-11-15T10:00:00-05:00")
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).performScrollTo().performTextInput("Descripcion independiente")
        org.junit.Assert.assertEquals("DANOS", viewModel?.uiState?.value?.causa)
        org.junit.Assert.assertEquals("2026-11-15T10:00:00-05:00", viewModel?.uiState?.value?.fechaEvento)
        org.junit.Assert.assertEquals("Descripcion independiente", viewModel?.uiState?.value?.descripcion)
        actividad.finish()
    }

    @Test
    fun `evidencia abre visor con MIME y acceso de lectura por FileProvider`() {
        mockkStatic(FileProvider::class)
        val uri = Uri.parse("content://${contexto.packageName}.evidencias/evidencias/foto.jpg")
        every { FileProvider.getUriForFile(any(), "${contexto.packageName}.evidencias", any()) } returns uri
        repositorio.reportes = listOf(SiniestroResumen("reporte", "88-2026-1000", "REPORTADO", "poliza", "fecha"))
        repositorio.evidenciasReporte = listOf(EvidenciaReporte("evidencia", "foto.jpg"))
        repositorio.archivoDescarga = "foto.jpg" to "image/jpeg"
        val actividad = montar()

        compose.onNodeWithTag("reporte_reporte").performClick()
        compose.onNodeWithTag("ver_evidencia_evidencia").performScrollTo().performClick()
        compose.waitForIdle()
        val solicitud = Shadows.shadowOf(actividad).nextStartedActivity
        org.junit.Assert.assertEquals(Intent.ACTION_VIEW, solicitud.action)
        org.junit.Assert.assertEquals("image/jpeg", solicitud.type)
        org.junit.Assert.assertEquals("content", solicitud.data?.scheme)
        org.junit.Assert.assertEquals("${contexto.packageName}.evidencias", solicitud.data?.authority)
        org.junit.Assert.assertTrue(solicitud.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
        actividad.finish()
    }

    @Test
    fun `descargar documento permite elegir destino con nombre y MIME del backend`() {
        repositorio.reportes = listOf(SiniestroResumen("reporte", "88-2026-1000", "REPORTADO", "poliza", "fecha"))
        repositorio.evidenciasReporte = listOf(EvidenciaReporte("evidencia", "informe.pdf"))
        repositorio.archivoDescarga = "informe.pdf" to "application/pdf"
        val actividad = montar()

        compose.onNodeWithTag("reporte_reporte").performClick()
        compose.onNodeWithTag("descargar_evidencia_evidencia").performScrollTo().performClick()
        compose.waitForIdle()
        val solicitud = Shadows.shadowOf(actividad).nextStartedActivityForResult
        org.junit.Assert.assertEquals(Intent.ACTION_CREATE_DOCUMENT, solicitud.intent.action)
        org.junit.Assert.assertEquals("application/pdf", solicitud.intent.type)
        org.junit.Assert.assertEquals("informe.pdf", solicitud.intent.getStringExtra(Intent.EXTRA_TITLE))
        val archivo = File(contexto.cacheDir, "destino.pdf")
        val destino = Uri.parse("content://documentos/destino.pdf")
        Shadows.shadowOf(contexto.contentResolver).registerOutputStream(destino, archivo.outputStream())
        Shadows.shadowOf(actividad).receiveResult(solicitud.intent, android.app.Activity.RESULT_OK, Intent().setData(destino))
        compose.waitUntil(5_000) { viewModel?.uiState?.value?.archivoPorGuardar == null }
        org.junit.Assert.assertEquals("contenido", archivo.readText())
        compose.waitForIdle()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_evidencia_guardada)).performScrollTo().assertIsDisplayed()
        archivo.delete()
        compose.runOnUiThread { actividad.finish() }
    }

    @After
    fun limpiarProveedorSimulado() {
        actividadMontada?.let { actividad -> compose.runOnUiThread { actividad.finish() } }
        unmockkStatic(FileProvider::class)
    }

    @Test
    fun `descarga fallida conserva detalle y permite intentar de nuevo`() {
        repositorio.reportes = listOf(SiniestroResumen("reporte", "88-2026-1000", "REPORTADO", "poliza", "fecha"))
        repositorio.evidenciasReporte = listOf(EvidenciaReporte("evidencia", "foto.jpg"))
        val actividad = montar()

        compose.onNodeWithTag("reporte_reporte").performClick()
        compose.onNodeWithTag("descargar_evidencia_evidencia").performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_generico)).performScrollTo().assertIsDisplayed()
        org.junit.Assert.assertNull(viewModel?.uiState?.value?.descargandoEvidencia)
        org.junit.Assert.assertEquals("reporte", viewModel?.uiState?.value?.reporte?.resumen?.id)
        compose.onNodeWithTag("descargar_evidencia_evidencia").performScrollTo().performClick()
        compose.waitForIdle()
        org.junit.Assert.assertEquals(2, repositorio.intentosDescarga)
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `historial muestra radicado estado vigente y separa los pendientes`() {
        repositorio.reportes = listOf(SiniestroResumen("reporte", "88-2026-1000", "EN_EVALUACION", "poliza", "2026-11-16T10:00:00Z"))
        repositorio.borradores = listOf(BorradorResumen("borrador", "poliza", "Pendiente", "ABIERTO", "fecha", 0, 0))
        val actividad = montar()
        compose.onNodeWithText("88-2026-1000").assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_en_evaluacion)).assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.borrador("borrador")).assertDoesNotExist()
        compose.onNodeWithTag("reporte_reporte").performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_en_evaluacion)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_numero_poliza)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("POL-02").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_estado_abierto)).assertDoesNotExist()
        compose.onNodeWithContentDescription(contexto.getString(R.string.siniestros_volver)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendientes)).performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.borrador("borrador")).assertIsDisplayed()
        compose.onNodeWithText("88-2026-1000").assertDoesNotExist()
        actividad.finish()
    }

    @Test
    fun `detalle sigue disponible cuando no se puede consultar el numero de poliza`() {
        repositorio.reportes = listOf(SiniestroResumen("reporte", "88-2026-1000", "EN_EVALUACION", "poliza-no-disponible", "2026-11-16T10:00:00Z"))
        val actividad = montar()

        compose.onNodeWithTag("reporte_reporte").performClick()
        compose.onNodeWithText("88-2026-1000").assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_numero_poliza_no_disponible))
            .performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("poliza-no-disponible").assertDoesNotExist()

        actividad.finish()
    }

    @Test
    fun `permiso concedido permite entrar a la camara`() {
        Shadows.shadowOf(contexto).grantPermissions(Manifest.permission.CAMERA)
        val actividad = montar()

        abrirFormulario()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_tomar_foto)).performScrollTo().performClick()
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

        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendientes)).performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.borrador("borrador-1")).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_detalle_titulo)).assertIsDisplayed()
        compose.onNodeWithText("foto.jpg").assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_estado_carga_completada)).assertIsDisplayed()
        compose.onNodeWithText("video.mp4").assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_estado_carga_pendiente)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_completar_borrador)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_nuevo_titulo)).assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.DESCRIPCION).assertIsDisplayed()

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
        compose.onNodeWithText(contexto.getString(R.string.siniestros_reportar_ahora)).performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_guardar_borrador)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_descripcion)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_descartar)).performScrollTo().performClick()
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

        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendientes)).performClick()
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

        compose.onNodeWithText(contexto.getString(R.string.siniestros_capturas_titulo)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_tamano_archivo, archivo.name, "1 KiB")).performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription(contexto.getString(R.string.siniestros_captura_eliminar)).performScrollTo().performClick()
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
            FalloSiniestros.SolicitudInvalida to R.string.siniestros_error_datos,
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

    @Test
    fun `ubicacion pide consentimiento muestra aproximada confirmada y permite reintentar lectura imprecisa`() {
        prepararBorradorConEvidencia()
        val proveedor = ProveedorFalso()
        proveedor.lectura = proveedor.lectura.copy(precisionM = 100.01)
        val actividad = montar(proveedor)
        abrirBorrador()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_obtener)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_explicacion_titulo)).assertIsDisplayed()
        org.junit.Assert.assertEquals(0, proveedor.capturas)
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_continuar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_no_confiable)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsNotEnabled()
        proveedor.lectura = proveedor.lectura.copy(precisionM = 99.99)
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_obtener)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_continuar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_permiso_aproximado)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_disponible)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_latitud, "4,6097123"), substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_longitud, "-74,0817534"), substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsEnabled()
        org.junit.Assert.assertEquals(99.99, repositorio.detalleActual.ubicacion?.lectura?.precisionM)
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `PATCH fallido no simula exito y muestra reintento sin perder el borrador`() {
        prepararBorradorConEvidencia()
        repositorio.falloUbicacion = FalloSiniestros.SinConexion
        val actividad = montar(ProveedorFalso())
        abrirBorrador()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_obtener)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_continuar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_pendiente)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_disponible)).assertDoesNotExist()
        org.junit.Assert.assertEquals("borrador-1", viewModel?.uiState?.value?.borradorActualId)
        repositorio.falloUbicacion = null
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_reintentar_guardado)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_disponible)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsEnabled()
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `cancelar explicacion permite enviar si ubicacion es opcional y el reporte esta completo`() {
        prepararBorradorConEvidencia()
        repositorio.reglas = ReglasUbicacion(false, emptyList(), 100.0)
        val proveedor = ProveedorFalso()
        proveedor.lectura = UbicacionCapturada(PermisoUbicacion.NO_SOLICITADO)
        val actividad = montar(proveedor)
        abrirBorrador()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_opcional)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_obtener)).performScrollTo().performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_explicacion_titulo)).assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_cancelar)).performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_sin_registrar)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsEnabled()
        org.junit.Assert.assertEquals(0, proveedor.capturas)
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `poliza mixta actualiza mensaje y boton al cambiar causa con permiso denegado`() {
        prepararBorradorConEvidencia()
        repositorio.reglas = ReglasUbicacion(true, listOf("AUXILIO_FUNERARIO", "ENFERMEDADES_GRAVES"), 100.0)
        repositorio.detalleActual = repositorio.detalleActual.copy(causa = "AUXILIO_FUNERARIO")
        polizas.coberturas = listOf(
            Cobertura("AUXILIO_FUNERARIO", "Auxilio funerario", true),
            Cobertura("MUERTE", "Muerte", false),
        )
        val proveedor = ProveedorFalso()
        proveedor.lectura = UbicacionCapturada(PermisoUbicacion.DENEGADO)
        val actividad = montar(proveedor)
        abrirBorrador()
        compose.runOnUiThread { viewModel?.capturarUbicacion() }
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_opcional)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_no_disponible)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsEnabled()
        compose.onNodeWithTag(EtiquetasSiniestros.CAUSA).performScrollTo().performClick()
        compose.onNodeWithText("Muerte (MUERTE)").performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_obligatoria)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsNotEnabled()
        compose.onNodeWithTag(EtiquetasSiniestros.CAUSA).performScrollTo().performClick()
        compose.onNodeWithText("Auxilio funerario (AUXILIO_FUNERARIO)").performClick()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_opcional)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsEnabled()
        org.junit.Assert.assertEquals("borrador-1", viewModel?.uiState?.value?.borradorActualId)
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    fun `formulario explica evidencia faltante aunque ubicacion sea opcional`() {
        prepararBorradorConEvidencia()
        repositorio.reglas = ReglasUbicacion(false, emptyList(), 100.0)
        repositorio.detalleActual = repositorio.detalleActual.copy(cantidadEvidencias = 0, evidencias = emptyList())
        val actividad = montar()
        abrirBorrador()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsNotEnabled()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_evidencia_obligatoria)).performScrollTo().assertIsDisplayed()
        val archivo = almacen.crearArchivo("jpg").apply { writeBytes(byteArrayOf(1, 2, 3)) }
        compose.runOnUiThread { viewModel?.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA) }
        compose.onNodeWithText(contexto.getString(R.string.siniestros_error_evidencia_obligatoria)).assertDoesNotExist()
        compose.onNodeWithTag(EtiquetasSiniestros.ENVIAR).performScrollTo().assertIsEnabled()
        compose.runOnUiThread {
            viewModel?.uiState?.value?.evidencias?.firstOrNull()?.let { viewModel?.eliminarCaptura(it.id) }
        }
        compose.waitForIdle()
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    @Config(qualifiers = "en-rUS-w411dp-h891dp")
    fun `ubicacion en ingles al 200 por ciento permite llegar a ajustes sin ciclos de permiso`() {
        prepararBorradorConEvidencia()
        val proveedor = ProveedorFalso()
        proveedor.lectura = UbicacionCapturada(PermisoUbicacion.DENEGADO_PERMANENTEMENTE)
        repositorio.detalleActual = repositorio.detalleActual.copy(
            ubicacion = UbicacionReporte(proveedor.lectura, EstadoUbicacion.NO_DISPONIBLE),
        )
        val actividad = montar(proveedor, escalaFuente = 2f)
        abrirBorrador()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_permiso_permanente)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Latitude:", substring = true).assertDoesNotExist()
        compose.onNodeWithText("Longitude:", substring = true).assertDoesNotExist()
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_abrir_ajustes)).performScrollTo().performClick()
        val intent = Shadows.shadowOf(actividad).nextStartedActivity
        org.junit.Assert.assertEquals(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, intent.action)
        org.junit.Assert.assertEquals("package:${contexto.packageName}", intent.data.toString())
        org.junit.Assert.assertEquals(0, proveedor.capturas)
        compose.onNodeWithText(contexto.getString(R.string.ubicacion_guardar_borrador)).performScrollTo().assertIsDisplayed()
        compose.runOnUiThread { actividad.finish() }
    }

    @Test
    @Config(qualifiers = "en-rUS-w411dp-h891dp")
    fun `detalle definitivo muestra coordenadas guardadas en el formato local`() {
        repositorio.reportes = listOf(SiniestroResumen("reporte", "88-2026-1000", "REPORTADO", "poliza", "fecha"))
        repositorio.ubicacionReporte = UbicacionReporte(
            UbicacionCapturada(PermisoUbicacion.PRECISO, 4.6097123, -74.0817534, 13.87, "2026-11-18T17:00:00Z"),
            EstadoUbicacion.DISPONIBLE,
        )
        val actividad = montar()
        compose.onNodeWithTag("reporte_reporte").performClick()
        compose.onNodeWithText("Latitude: 4.6097123°.", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Longitude: -74.0817534°.", substring = true).performScrollTo().assertIsDisplayed()
        compose.runOnUiThread { actividad.finish() }
    }

    private fun prepararBorradorConEvidencia() {
        repositorio.borradores = listOf(BorradorResumen("borrador-1", "poliza-1", "Choque", "ABIERTO", "fecha", 1, 0))
        repositorio.detalleActual = repositorio.detalleActual.copy(
            causa = "DANOS", fechaEvento = "2026-11-17T10:00:00-05:00", cantidadEvidencias = 1,
            evidencias = listOf(Evidencia("foto", "foto.jpg", TipoEvidencia.FOTOGRAFIA, "image/jpeg", 10, EstadoCarga.CARGADA, null, null)),
        )
    }

    private fun abrirBorrador() {
        compose.onNodeWithText(contexto.getString(R.string.siniestros_pendientes)).performClick()
        compose.onNodeWithTag(EtiquetasSiniestros.borrador("borrador-1")).performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_completar_borrador)).performScrollTo().performClick()
    }

    private fun abrirFormulario() {
        compose.onNodeWithTag(EtiquetasSiniestros.REPORTAR).performClick()
        compose.waitForIdle()
    }

    private fun seleccionarPoliza() {
        compose.onNodeWithText(contexto.getString(R.string.siniestros_seleccionar_seguro)).performClick()
        compose.onNodeWithText("POL-01 · Auto").performClick()
    }

    private fun montar(
        proveedor: ProveedorUbicacion? = null,
        escalaFuente: Float = 1f,
        importador: ImportadorEvidencias? = null,
        pendientes: AlmacenPendientesFalso = AlmacenPendientesFalso(),
    ): ComponentActivity {
        val actividad = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        actividadMontada = actividad
        val viewModel = SiniestrosViewModel(
            repositorio,
            polizas,
            almacen,
            mockk<GestorSesion>(relaxed = true),
            ahora = { OffsetDateTime.parse("2026-11-18T13:00:00-05:00") },
            proveedorUbicacion = proveedor,
            importadorEvidencias = importador,
            almacenPendientes = pendientes,
        )
        this.viewModel = viewModel
        actividad.setContent {
            MaterialTheme {
                CompositionLocalProvider(LocalDensity provides Density(LocalDensity.current.density, escalaFuente)) {
                    SiniestrosRoute(viewModel, onIrALogin = {})
                }
            }
        }
        compose.waitForIdle()
        return actividad
    }

    private class RepositorioFalso : RepositorioSiniestros {
        override suspend fun guardarDatos(borradorId: String, descripcion: String, causa: String?, fechaEvento: String?) =
            Resultado.Exito(detalleActual.copy(descripcion = descripcion, causa = causa, fechaEvento = fechaEvento))
        var falloUbicacion: FalloSiniestros? = null
        override suspend fun guardarUbicacion(borradorId: String, ubicacion: UbicacionCapturada): Resultado<BorradorDetalle> {
            falloUbicacion?.let { return Resultado.Fallo(it) }
            val precision = ubicacion.precisionM
            val estado = when {
                precision == null -> EstadoUbicacion.NO_DISPONIBLE
                precision <= 100.0 -> EstadoUbicacion.DISPONIBLE
                else -> EstadoUbicacion.NO_CONFIABLE
            }
            detalleActual = detalleActual.copy(ubicacion = UbicacionReporte(ubicacion, estado))
            return Resultado.Exito(detalleActual)
        }
        var evidenciasReporte = emptyList<EvidenciaReporte>()
        var ubicacionReporte: UbicacionReporte? = null
        var archivoDescarga: Pair<String, String>? = null
        var intentosDescarga = 0
        override suspend fun descargarEvidencia(siniestroId: String, evidenciaId: String, directorio: File): Resultado<ArchivoEvidencia> {
            intentosDescarga++
            val (nombre, mime) = archivoDescarga ?: return Resultado.Fallo(FalloSiniestros.ServicioNoDisponible)
            directorio.mkdirs()
            val archivo = File(directorio, nombre).apply { writeText("contenido") }
            return Resultado.Exito(ArchivoEvidencia(archivo, nombre, mime))
        }

        var borradores = emptyList<BorradorResumen>()
        var falloCarga: FalloSiniestros? = null
        var falloDetalle: FalloSiniestros? = null
        var falloCreacion: FalloSiniestros = FalloSiniestros.RespuestaInvalida
        var reglas = ReglasUbicacion(true, emptyList(), 100.0)
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
            LimitesSiniestros(10, listOf("image/jpeg"), listOf("video/mp4"), 10_240, 20_480, 60, 300, reglas),
        )

        override suspend fun listar() = Resultado.Exito(borradores)

        var reportes = emptyList<SiniestroResumen>()
        override suspend fun historial(cursor: String?) =
            falloCarga?.let { Resultado.Fallo(it) } ?: Resultado.Exito(PaginaSiniestros(reportes, null))

        override suspend fun siniestro(siniestroId: String) = Resultado.Exito(
            SiniestroDetalle(reportes.single { it.id == siniestroId }, "Choque", "DANOS", "2026-11-15T10:00:00-05:00", evidenciasReporte, emptyList(), ubicacionReporte),
        )

        override suspend fun actualizar(borradorId: String, descripcion: String, causa: String, fechaEvento: String) =
            Resultado.Exito(detalleActual.copy(descripcion = descripcion, causa = causa, fechaEvento = fechaEvento))

        override suspend fun enviar(borradorId: String, claveIdempotencia: String): Resultado<EnvioSiniestro> =
            Resultado.Fallo(FalloSiniestros.ServicioNoDisponible)

        override suspend fun eliminarEvidencia(borradorId: String, evidenciaId: String) = Resultado.Exito(Unit)

        override suspend fun detalle(borradorId: String) =
            falloDetalle?.let { Resultado.Fallo(it) } ?: Resultado.Exito(detalleActual)

        override suspend fun crearBorrador(polizaId: String, descripcion: String, claveIdempotencia: String) =
            Resultado.Fallo(falloCreacion)

        override suspend fun agregarEvidencia(
            borradorId: String,
            evidencia: com.solventa.feature.siniestros.dominio.EvidenciaTemporal,
            limites: LimitesSiniestros,
        ) = Resultado.Fallo(com.solventa.feature.siniestros.dominio.FalloSiniestros.RespuestaInvalida)
    }

    private class ProveedorFalso : ProveedorUbicacion {
        var capturas = 0
        var lectura = UbicacionCapturada(PermisoUbicacion.APROXIMADO, 4.6097123, -74.0817534, 35.5, "2026-11-18T17:00:00Z")
        override fun permisoActual() = lectura.permiso
        override fun registrarRespuesta(permanente: Boolean) = Unit
        override suspend fun capturar(): CapturaUbicacion {
            capturas++
            return CapturaUbicacion(lectura)
        }
    }

    private class PolizasFalsas : RepositorioPolizas {
        var coberturas = listOf(Cobertura("DANOS", "Danos", false))
        private val activa = PolizaResumen(
            "poliza-1",
            "POL-01",
            "ACTIVA",
            "Auto",
            "Vehículos",
            Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31")),
            true,
            ResumenCobertura(BigDecimal.ZERO, "COP", 1),
        )

        override suspend fun listar() = ResultadoPolizas.Exito(
            listOf(activa, activa.copy(polizaId = "poliza-vencida", numero = "POL-VENCIDA")),
        )

        override suspend fun detalle(polizaId: String): ResultadoPolizas<PolizaDetalle> {
            val numero = when (polizaId) {
                "poliza-1" -> "POL-01"
                "poliza" -> "POL-02"
                "poliza-vencida" -> "POL-VENCIDA"
                else -> return ResultadoPolizas.Fallo(FalloPolizas.NoEncontrada)
            }
            val detalle = mockk<PolizaDetalle>()
            every { detalle.numero } returns numero
            every { detalle.estado } returns "ACTIVA"
            every { detalle.vigente } returns true
            every { detalle.coberturas } returns coberturas
            every { detalle.vigencia } returns if (polizaId == "poliza-vencida") {
                activa.vigencia.copy(hasta = LocalDate.parse("2026-10-14"))
            } else {
                activa.vigencia
            }
            return ResultadoPolizas.Exito(detalle)
        }
    }
}
