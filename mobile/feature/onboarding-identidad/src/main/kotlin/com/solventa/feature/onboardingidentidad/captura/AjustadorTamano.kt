package com.solventa.feature.onboardingidentidad.captura

/** Busca la combinación de escala y calidad JPEG más alta cuyo base64 cabe en el límite del backend. */
object AjustadorTamano {
    /** Máximo de caracteres de la selfie en base64 que acepta `POST /v1/identidad/verificaciones`. */
    const val MAX_CARACTERES_BASE64 = 5_000_000

    private val ESCALAS = floatArrayOf(1f, 0.75f, 0.5f, 0.35f)
    private val CALIDADES = intArrayOf(90, 80, 70, 60, 50)

    fun longitudBase64(bytes: Int): Int = 4 * ((bytes + 2) / 3)

    /**
     * Prueba de mayor a menor escala y calidad y devuelve el primer resultado que cabe, o null si
     * ninguno cabe. Los intentos descartados se sobrescriben: también son una selfie en memoria.
     */
    fun ajustar(
        maxCaracteres: Int = MAX_CARACTERES_BASE64,
        generar: (calidad: Int, escala: Float) -> ByteArray,
    ): ByteArray? {
        for (escala in ESCALAS) {
            for (calidad in CALIDADES) {
                val candidato = generar(calidad, escala)
                if (longitudBase64(candidato.size) <= maxCaracteres) return candidato
                candidato.fill(0)
            }
        }
        return null
    }
}
