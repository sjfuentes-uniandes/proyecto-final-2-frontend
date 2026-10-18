package com.solventa.feature.onboardingidentidad.captura

/**
 * Lo que el detector facial vio en un cuadro, ya normalizado (sin tipos de ML Kit) para poder
 * razonar sobre él y probarlo en JVM. Las posiciones van de 0 a 1 respecto al cuadro orientado en
 * vertical; los ángulos, en grados.
 */
data class ObservacionRostro(
    val centroX: Float,
    val centroY: Float,
    val anchoRelativo: Float,
    val giroHorizontal: Float,
    val inclinacion: Float,
    val probOjoIzquierdoAbierto: Float?,
    val probOjoDerechoAbierto: Float?,
)

/** Un cuadro analizado: los rostros detectados, la luminosidad media (0 a 255) y su instante. */
data class ObservacionFrame(
    val rostros: List<ObservacionRostro>,
    val luminosidad: Float,
    val tiempoMs: Long,
)

/** Qué le falta a la captura para cumplir las condiciones mínimas, o [OK]. */
enum class CondicionCaptura {
    OK,
    ILUMINACION_INSUFICIENTE,
    SIN_ROSTRO,
    VARIOS_ROSTROS,
    ACERCAR_ROSTRO,
    ALEJAR_ROSTRO,
    CENTRAR_ROSTRO,
    MIRAR_AL_FRENTE,
    ABRIR_OJOS,
}

/** Umbrales de la captura; viven juntos para ajustarlos en un solo lugar. */
data class UmbralesCaptura(
    val luminosidadMinima: Float = 60f,
    val anchoMinimo: Float = 0.30f,
    val anchoMaximo: Float = 0.80f,
    val desvioCentroMaximo: Float = 0.20f,
    val giroFrontalMaximo: Float = 12f,
    val inclinacionMaxima: Float = 15f,
    val ojoAbierto: Float = 0.60f,
    val ojoCerrado: Float = 0.30f,
    val giroDeRetoMinimo: Float = 20f,
    val duracionRetoMs: Long = 10_000,
)
