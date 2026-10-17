package com.solventa.feature.onboardingidentidad.captura

import org.junit.Test
import kotlin.test.assertEquals

class RetoDeVidaTest {
    private val abiertos = rostro(ojoIzquierdo = 0.9f, ojoDerecho = 0.9f)
    private val cerrados = rostro(ojoIzquierdo = 0.05f, ojoDerecho = 0.05f)

    @Test
    fun `el parpadeo se cumple con ojos abiertos, cerrados y abiertos de nuevo`() {
        val reto = ParpadeoReto()

        assertEquals(EstadoReto.EN_CURSO, reto.procesar(abiertos))
        assertEquals(EstadoReto.EN_CURSO, reto.procesar(cerrados))
        assertEquals(EstadoReto.CUMPLIDO, reto.procesar(abiertos))
    }

    @Test
    fun `mantener los ojos abiertos nunca cumple el parpadeo`() {
        val reto = ParpadeoReto()

        repeat(20) { assertEquals(EstadoReto.EN_CURSO, reto.procesar(abiertos)) }
    }

    @Test
    fun `empezar con los ojos cerrados no cuenta hasta verlos abiertos primero`() {
        val reto = ParpadeoReto()

        assertEquals(EstadoReto.EN_CURSO, reto.procesar(cerrados))
        assertEquals(EstadoReto.EN_CURSO, reto.procesar(abiertos))
        assertEquals(EstadoReto.EN_CURSO, reto.procesar(cerrados))
        assertEquals(EstadoReto.CUMPLIDO, reto.procesar(abiertos))
    }

    @Test
    fun `sin estimacion de ojos el parpadeo no avanza`() {
        val reto = ParpadeoReto()
        val sinEstimar = rostro(ojoIzquierdo = null, ojoDerecho = null)

        reto.procesar(abiertos)
        reto.procesar(sinEstimar)
        reto.procesar(sinEstimar)

        assertEquals(EstadoReto.EN_CURSO, reto.procesar(abiertos))
    }

    @Test
    fun `un ojo cerrado y otro abierto no cuenta como parpadeo`() {
        val reto = ParpadeoReto()
        val guino = rostro(ojoIzquierdo = 0.05f, ojoDerecho = 0.9f)

        reto.procesar(abiertos)
        reto.procesar(guino)

        assertEquals(EstadoReto.EN_CURSO, reto.procesar(abiertos))
    }

    @Test
    fun `reiniciar obliga a empezar el parpadeo desde el principio`() {
        val reto = ParpadeoReto()
        reto.procesar(abiertos)
        reto.procesar(cerrados)

        reto.reiniciar()

        assertEquals(EstadoReto.EN_CURSO, reto.procesar(abiertos))
    }

    @Test
    fun `el giro se cumple de frente y luego girando hacia cualquier lado`() {
        val derecha = GiroCabezaReto().apply { procesar(rostro(giro = 0f)) }
        val izquierda = GiroCabezaReto().apply { procesar(rostro(giro = 0f)) }

        assertEquals(EstadoReto.CUMPLIDO, derecha.procesar(rostro(giro = 25f)))
        assertEquals(EstadoReto.CUMPLIDO, izquierda.procesar(rostro(giro = -25f)))
    }

    @Test
    fun `empezar ya girado no cumple el giro hasta pasar por el frente`() {
        val reto = GiroCabezaReto()

        assertEquals(EstadoReto.EN_CURSO, reto.procesar(rostro(giro = 30f)))
        assertEquals(EstadoReto.EN_CURSO, reto.procesar(rostro(giro = 0f)))
        assertEquals(EstadoReto.CUMPLIDO, reto.procesar(rostro(giro = 30f)))
    }

    @Test
    fun `un giro pequeno no cumple el reto`() {
        val reto = GiroCabezaReto()
        reto.procesar(rostro(giro = 0f))

        assertEquals(EstadoReto.EN_CURSO, reto.procesar(rostro(giro = 15f)))
    }
}
