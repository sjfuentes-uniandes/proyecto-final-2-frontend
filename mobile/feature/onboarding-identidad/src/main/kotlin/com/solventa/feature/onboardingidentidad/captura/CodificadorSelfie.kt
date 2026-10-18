package com.solventa.feature.onboardingidentidad.captura

import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

/** Convierte el cuadro capturado en una [SelfieEnMemoria] JPEG que respeta el límite del backend. */
object CodificadorSelfie {
    private const val LADO_MAXIMO_PX = 1280

    /** Devuelve null si ni a la menor escala y calidad cabe en el límite. No toca el bitmap original. */
    fun codificar(bitmap: Bitmap): SelfieEnMemoria? {
        val factor = LADO_MAXIMO_PX.toFloat() / max(bitmap.width, bitmap.height)
        val base = if (factor < 1f) escalar(bitmap, factor) else bitmap
        try {
            val jpeg = AjustadorTamano.ajustar { calidad, escala ->
                val intento = if (escala == 1f) base else escalar(base, escala)
                try {
                    ByteArrayOutputStream().use { salida ->
                        intento.compress(Bitmap.CompressFormat.JPEG, calidad, salida)
                        salida.toByteArray()
                    }
                } finally {
                    if (intento !== base) intento.recycle()
                }
            }
            return jpeg?.let(::SelfieEnMemoria)
        } finally {
            if (base !== bitmap) base.recycle()
        }
    }

    private fun escalar(origen: Bitmap, factor: Float): Bitmap =
        Bitmap.createScaledBitmap(
            origen,
            (origen.width * factor).roundToInt().coerceAtLeast(1),
            (origen.height * factor).roundToInt().coerceAtLeast(1),
            true,
        )
}
