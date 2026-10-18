package com.solventa.feature.onboardingidentidad.captura

/** Constructores de datos de prueba: por defecto, un rostro frontal, centrado y bien iluminado. */
internal fun rostro(
    centroX: Float = 0.5f,
    centroY: Float = 0.5f,
    ancho: Float = 0.5f,
    giro: Float = 0f,
    inclinacion: Float = 0f,
    ojoIzquierdo: Float? = 0.9f,
    ojoDerecho: Float? = 0.9f,
) = ObservacionRostro(centroX, centroY, ancho, giro, inclinacion, ojoIzquierdo, ojoDerecho)

internal fun frame(
    rostro: ObservacionRostro = rostro(),
    luminosidad: Float = 120f,
    tiempoMs: Long = 0,
) = ObservacionFrame(listOf(rostro), luminosidad, tiempoMs)

internal fun frameConRostros(
    vararg rostros: ObservacionRostro,
    luminosidad: Float = 120f,
    tiempoMs: Long = 0,
) = ObservacionFrame(rostros.toList(), luminosidad, tiempoMs)
