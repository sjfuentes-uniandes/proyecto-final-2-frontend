package com.solventa.feature.onboardingidentidad.captura

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class FlujoCapturaTest {
    private val umbrales = UmbralesCaptura(duracionRetoMs = 5_000)

    private fun flujoConParpadeo() = FlujoCaptura(umbrales, elegirReto = { ParpadeoReto(umbrales) })
    private fun flujoConGiro() = FlujoCaptura(umbrales, elegirReto = { GiroCabezaReto(umbrales) })

    private val cerrados = rostro(ojoIzquierdo = 0.05f, ojoDerecho = 0.05f)

    @Test
    fun `con parpadeo completa y captura el cuadro con ojos abiertos de frente`() {
        val flujo = flujoConParpadeo()

        assertEquals(PasoCaptura.Reto(TipoReto.PARPADEO), flujo.procesar(frame(tiempoMs = 0)))
        assertEquals(PasoCaptura.Reto(TipoReto.PARPADEO), flujo.procesar(frame(cerrados, tiempoMs = 100)))
        assertEquals(PasoCaptura.Completado, flujo.procesar(frame(tiempoMs = 200)))
    }

    @Test
    fun `con giro espera volver a mirar al frente antes de capturar`() {
        val flujo = flujoConGiro()

        assertEquals(PasoCaptura.Reto(TipoReto.GIRO_CABEZA), flujo.procesar(frame(rostro(giro = 0f), tiempoMs = 0)))
        assertEquals(
            PasoCaptura.Guia(CondicionCaptura.MIRAR_AL_FRENTE),
            flujo.procesar(frame(rostro(giro = 30f), tiempoMs = 100)),
        )
        assertEquals(PasoCaptura.Completado, flujo.procesar(frame(rostro(giro = 2f), tiempoMs = 200)))
    }

    @Test
    fun `una foto fija sin parpadeo nunca completa`() {
        val flujo = flujoConParpadeo()

        repeat(40) { indice ->
            val paso = flujo.procesar(frame(tiempoMs = indice * 100L))
            assertIs<PasoCaptura>(paso)
            assertEquals(false, paso is PasoCaptura.Completado)
        }
    }

    @Test
    fun `las condiciones incumplidas guian y reinician el progreso del reto`() {
        val flujo = flujoConParpadeo()
        flujo.procesar(frame(tiempoMs = 0))
        flujo.procesar(frame(cerrados, tiempoMs = 100))

        assertEquals(PasoCaptura.Guia(CondicionCaptura.ILUMINACION_INSUFICIENTE), flujo.procesar(frame(luminosidad = 10f, tiempoMs = 200)))

        // El progreso se perdió: reabrir los ojos ya no cumple el reto.
        assertEquals(PasoCaptura.Reto(TipoReto.PARPADEO), flujo.procesar(frame(tiempoMs = 300)))
    }

    @Test
    fun `el reto expira, avisa y arranca uno nuevo`() {
        val flujo = flujoConParpadeo()
        flujo.procesar(frame(tiempoMs = 0))

        assertEquals(PasoCaptura.RetoExpirado(TipoReto.PARPADEO), flujo.procesar(frame(tiempoMs = 6_000)))
        assertEquals(PasoCaptura.Reto(TipoReto.PARPADEO), flujo.procesar(frame(tiempoMs = 6_100)))
    }

    @Test
    fun `el reloj del reto arranca con el primer cuadro valido, no con el primero recibido`() {
        val flujo = flujoConParpadeo()

        flujo.procesar(frame(luminosidad = 10f, tiempoMs = 0))
        flujo.procesar(frame(luminosidad = 10f, tiempoMs = 4_000))

        assertEquals(PasoCaptura.Reto(TipoReto.PARPADEO), flujo.procesar(frame(tiempoMs = 6_000)))
    }

    @Test
    fun `si en el tramo final aparece otro rostro o desaparece, se reinicia todo`() {
        val flujo = flujoConGiro()
        flujo.procesar(frame(rostro(giro = 0f), tiempoMs = 0))
        flujo.procesar(frame(rostro(giro = 30f), tiempoMs = 100)) // reto cumplido, falta mirar al frente

        assertEquals(PasoCaptura.Guia(CondicionCaptura.VARIOS_ROSTROS), flujo.procesar(frameConRostros(rostro(), rostro(), tiempoMs = 200)))

        // Volvió a empezar: mirar al frente ya no basta, hay que repetir el giro.
        assertEquals(PasoCaptura.Reto(TipoReto.GIRO_CABEZA), flujo.procesar(frame(rostro(giro = 0f), tiempoMs = 300)))
    }

    @Test
    fun `una vez completado sigue completado hasta reiniciar`() {
        val flujo = flujoConParpadeo()
        flujo.procesar(frame(tiempoMs = 0))
        flujo.procesar(frame(cerrados, tiempoMs = 100))
        flujo.procesar(frame(tiempoMs = 200))

        assertEquals(PasoCaptura.Completado, flujo.procesar(frame(luminosidad = 5f, tiempoMs = 300)))

        flujo.reiniciar()
        assertEquals(PasoCaptura.Reto(TipoReto.PARPADEO), flujo.procesar(frame(tiempoMs = 400)))
    }
}
