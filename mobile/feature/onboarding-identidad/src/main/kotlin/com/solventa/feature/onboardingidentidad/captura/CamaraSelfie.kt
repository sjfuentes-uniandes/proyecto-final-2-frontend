package com.solventa.feature.onboardingidentidad.captura

import android.graphics.Bitmap
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.util.concurrent.Executors

/**
 * Vista previa de la cámara frontal con análisis facial. Solo muestra y analiza: el permiso de
 * cámara debe estar concedido antes de componerla. Libera la cámara y el detector al salir de la
 * composición.
 */
@Composable
fun CamaraSelfie(
    alObservar: (ObservacionFrame) -> Boolean,
    alCapturar: (Bitmap) -> Unit,
    alFallar: (Throwable) -> Unit,
    modifier: Modifier = Modifier,
) {
    val contexto = LocalContext.current
    val propietario = LocalLifecycleOwner.current
    val vista = remember { PreviewView(contexto).apply { scaleType = PreviewView.ScaleType.FILL_CENTER } }
    val observar by rememberUpdatedState(alObservar)
    val capturar by rememberUpdatedState(alCapturar)
    val fallar by rememberUpdatedState(alFallar)

    DisposableEffect(propietario) {
        val ejecutor = Executors.newSingleThreadExecutor()
        val analizador = AnalizadorRostro(
            alObservar = { observar(it) },
            alCapturar = { capturar(it) },
        )
        val futuroProveedor = ProcessCameraProvider.getInstance(contexto)
        var proveedor: ProcessCameraProvider? = null
        var liberado = false

        futuroProveedor.addListener(
            {
                if (liberado) return@addListener
                try {
                    val resolucion = ResolutionSelector.Builder()
                        .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
                        // Más resolución que el valor por defecto (640x480): la selfie debe ser nítida.
                        .setResolutionStrategy(
                            ResolutionStrategy(Size(1280, 960), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER),
                        )
                        .build()
                    val previa = Preview.Builder().setResolutionSelector(resolucion).build()
                        .also { it.surfaceProvider = vista.surfaceProvider }
                    val analisis = ImageAnalysis.Builder()
                        .setResolutionSelector(resolucion)
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { it.setAnalyzer(ejecutor, analizador) }

                    proveedor = futuroProveedor.get().also {
                        it.unbindAll()
                        it.bindToLifecycle(propietario, CameraSelector.DEFAULT_FRONT_CAMERA, previa, analisis)
                    }
                } catch (e: Exception) {
                    fallar(e)
                }
            },
            ContextCompat.getMainExecutor(contexto),
        )

        onDispose {
            liberado = true
            proveedor?.unbindAll()
            analizador.cerrar()
            ejecutor.shutdown()
        }
    }

    AndroidView(factory = { vista }, modifier = modifier)
}
