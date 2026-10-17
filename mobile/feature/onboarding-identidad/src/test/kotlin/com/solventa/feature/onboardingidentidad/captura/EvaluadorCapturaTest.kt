package com.solventa.feature.onboardingidentidad.captura

import org.junit.Test
import kotlin.test.assertEquals

class EvaluadorCapturaTest {
    private val evaluador = EvaluadorCaptura()

    @Test
    fun `un rostro frontal, centrado y bien iluminado cumple`() {
        assertEquals(CondicionCaptura.OK, evaluador.evaluar(frame(), exigirFrontal = true, exigirOjosAbiertos = true))
    }

    @Test
    fun `poca luz se reporta antes que la falta de rostro`() {
        assertEquals(CondicionCaptura.ILUMINACION_INSUFICIENTE, evaluador.evaluar(frame(luminosidad = 20f)))
        assertEquals(
            CondicionCaptura.ILUMINACION_INSUFICIENTE,
            evaluador.evaluar(ObservacionFrame(emptyList(), luminosidad = 20f, tiempoMs = 0)),
        )
    }

    @Test
    fun `sin rostros pide mostrar el rostro`() {
        assertEquals(CondicionCaptura.SIN_ROSTRO, evaluador.evaluar(ObservacionFrame(emptyList(), 120f, 0)))
    }

    @Test
    fun `mas de un rostro no es valido`() {
        assertEquals(CondicionCaptura.VARIOS_ROSTROS, evaluador.evaluar(frameConRostros(rostro(), rostro())))
    }

    @Test
    fun `rostro lejos o cerca pide ajustar la distancia`() {
        assertEquals(CondicionCaptura.ACERCAR_ROSTRO, evaluador.evaluar(frame(rostro(ancho = 0.2f))))
        assertEquals(CondicionCaptura.ALEJAR_ROSTRO, evaluador.evaluar(frame(rostro(ancho = 0.9f))))
    }

    @Test
    fun `rostro descentrado pide centrarlo`() {
        assertEquals(CondicionCaptura.CENTRAR_ROSTRO, evaluador.evaluar(frame(rostro(centroX = 0.85f))))
        assertEquals(CondicionCaptura.CENTRAR_ROSTRO, evaluador.evaluar(frame(rostro(centroY = 0.1f))))
    }

    @Test
    fun `el giro solo se exige cuando se pide frontal`() {
        val girado = frame(rostro(giro = 30f))

        assertEquals(CondicionCaptura.OK, evaluador.evaluar(girado))
        assertEquals(CondicionCaptura.MIRAR_AL_FRENTE, evaluador.evaluar(girado, exigirFrontal = true))
    }

    @Test
    fun `la inclinacion excesiva tampoco es frontal`() {
        assertEquals(CondicionCaptura.MIRAR_AL_FRENTE, evaluador.evaluar(frame(rostro(inclinacion = 25f)), exigirFrontal = true))
    }

    @Test
    fun `los ojos cerrados o sin estimar no son validos cuando se exigen abiertos`() {
        val cerrados = frame(rostro(ojoIzquierdo = 0.1f, ojoDerecho = 0.1f))
        val sinEstimar = frame(rostro(ojoIzquierdo = null, ojoDerecho = null))

        assertEquals(CondicionCaptura.ABRIR_OJOS, evaluador.evaluar(cerrados, exigirOjosAbiertos = true))
        assertEquals(CondicionCaptura.ABRIR_OJOS, evaluador.evaluar(sinEstimar, exigirOjosAbiertos = true))
        assertEquals(CondicionCaptura.OK, evaluador.evaluar(cerrados))
    }
}
