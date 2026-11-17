package com.solventa.feature.siniestros.ui

import android.app.Application
import androidx.activity.compose.setContent
import androidx.activity.ComponentActivity
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.google.common.util.concurrent.SettableFuture
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(org.robolectric.RobolectricTestRunner::class)
@Config(application = Application::class, qualifiers = "es-rCO-w411dp-h891dp")
class CamaraEvidenciasTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private val contexto = RuntimeEnvironment.getApplication()
    private val proveedor = mockk<ProcessCameraProvider>(relaxed = true)

    @Test
    fun `error al capturar foto elimina el temporal y deshabilita la captura`() {
        var archivo: File? = null
        val actividad = montarCamara(
            crearFoto = { File.createTempFile("foto-", ".jpg", contexto.cacheDir).also { archivo = it } },
        )

        compose.onNodeWithTag(EtiquetasCamara.FOTO).assertIsEnabled().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_camara_error)).assertIsDisplayed()

        assertFalse(archivo!!.exists())
        verify { proveedor.unbindAll() }
        actividad.finish()
    }

    @Test
    fun `inicia grabacion de video y muestra la duracion maxima`() {
        val actividad = montarCamara()

        compose.onNodeWithTag(EtiquetasCamara.VIDEO).assertIsEnabled().performClick()
        compose.onNodeWithText(contexto.getString(R.string.siniestros_video_limite, 60)).assertIsDisplayed()

        actividad.finish()
    }

    private fun montarCamara(
        crearFoto: () -> File = { File.createTempFile("foto-", ".jpg", contexto.cacheDir) },
        crearVideo: () -> File = { File.createTempFile("video-", ".mp4", contexto.cacheDir) },
    ): ComponentActivity {
        every {
            proveedor.bindToLifecycle(any(), any<CameraSelector>(), *anyVararg())
        } returns mockk(relaxed = true)
        val futuro = SettableFuture.create<ProcessCameraProvider>().apply { set(proveedor) }
        val actividad = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        actividad.setContent {
            MaterialTheme {
                CamaraEvidencias(
                    duracionMaximaSegundos = 60,
                    crearFoto = crearFoto,
                    crearVideo = crearVideo,
                    alCapturar = { _, _, _ -> error("No se esperaba una captura válida") },
                    alEliminar = { it.delete() },
                    alVolver = {},
                    obtenerProveedor = { futuro },
                )
            }
        }
        compose.waitForIdle()
        return actividad
    }
}
