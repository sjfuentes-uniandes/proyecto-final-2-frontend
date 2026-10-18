package com.solventa.feature.onboardingidentidad.captura

import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.SystemClock
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

/**
 * Analiza cada cuadro de la cámara con ML Kit: detecta rostros, mide la luminosidad y le pasa a
 * [alObservar] la [ObservacionFrame]. Si [alObservar] responde true, el cuadro actual se convierte
 * a [Bitmap] (ya girado, sin espejo) y se entrega a [alCapturar]; nada se escribe en disco.
 */
class AnalizadorRostro(
    private val alObservar: (ObservacionFrame) -> Boolean,
    private val alCapturar: (Bitmap) -> Unit,
    private val reloj: () -> Long = SystemClock::elapsedRealtime,
) : ImageAnalysis.Analyzer {

    private val detector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            // Necesario para la probabilidad de ojos abiertos (reto de parpadeo).
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .build(),
    )

    @androidx.annotation.OptIn(ExperimentalGetImage::class)
    override fun analyze(imagen: ImageProxy) {
        val imagenMedia = imagen.image
        if (imagenMedia == null) {
            imagen.close()
            return
        }
        val rotacion = imagen.imageInfo.rotationDegrees
        val luminosidad = luminosidadMedia(imagen)
        val vertical = rotacion % 180 == 0
        val ancho = if (vertical) imagen.width else imagen.height
        val alto = if (vertical) imagen.height else imagen.width

        detector.process(InputImage.fromMediaImage(imagenMedia, rotacion))
            .addOnSuccessListener { rostros ->
                val observacion = ObservacionFrame(
                    rostros = rostros.map { it.aObservacion(ancho, alto) },
                    luminosidad = luminosidad,
                    tiempoMs = reloj(),
                )
                if (alObservar(observacion)) alCapturar(imagen.toBitmap().girar(rotacion))
            }
            .addOnCompleteListener { imagen.close() }
    }

    fun cerrar() {
        detector.close()
    }

    // Muestrea el plano Y (brillo) sin recorrer cada píxel: basta para saber si hay poca luz.
    private fun luminosidadMedia(imagen: ImageProxy): Float {
        val plano = imagen.planes[0].buffer
        val total = plano.limit()
        var suma = 0L
        var muestras = 0
        var i = 0
        while (i < total) {
            suma += plano.get(i).toInt() and 0xFF
            muestras++
            i += PASO_MUESTREO
        }
        return if (muestras == 0) 0f else suma.toFloat() / muestras
    }

    private fun Face.aObservacion(ancho: Int, alto: Int) = ObservacionRostro(
        centroX = boundingBox.exactCenterX() / ancho,
        centroY = boundingBox.exactCenterY() / alto,
        anchoRelativo = boundingBox.width().toFloat() / ancho,
        giroHorizontal = headEulerAngleY,
        inclinacion = headEulerAngleZ,
        probOjoIzquierdoAbierto = leftEyeOpenProbability,
        probOjoDerechoAbierto = rightEyeOpenProbability,
    )

    private fun Bitmap.girar(grados: Int): Bitmap {
        if (grados == 0) return this
        val girado = Bitmap.createBitmap(this, 0, 0, width, height, Matrix().apply { postRotate(grados.toFloat()) }, true)
        recycle()
        return girado
    }

    private companion object {
        const val PASO_MUESTREO = 16
    }
}
