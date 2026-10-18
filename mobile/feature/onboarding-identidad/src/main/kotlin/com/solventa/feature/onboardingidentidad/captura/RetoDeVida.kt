package com.solventa.feature.onboardingidentidad.captura

import kotlin.math.abs

enum class TipoReto { PARPADEO, GIRO_CABEZA }

enum class EstadoReto { EN_CURSO, CUMPLIDO }

/** Reto de vida que la persona debe cumplir frente a la cámara para descartar una foto fija. */
interface RetoDeVida {
    val tipo: TipoReto

    fun procesar(rostro: ObservacionRostro): EstadoReto

    fun reiniciar()
}

/** Ojos abiertos, luego cerrados y de nuevo abiertos. */
class ParpadeoReto(private val umbrales: UmbralesCaptura = UmbralesCaptura()) : RetoDeVida {
    private enum class Fase { ESPERANDO_OJOS_ABIERTOS, ESPERANDO_CIERRE, ESPERANDO_REAPERTURA }

    override val tipo = TipoReto.PARPADEO
    private var fase = Fase.ESPERANDO_OJOS_ABIERTOS

    override fun procesar(rostro: ObservacionRostro): EstadoReto {
        val izquierdo = rostro.probOjoIzquierdoAbierto
        val derecho = rostro.probOjoDerechoAbierto
        // Sin estimación de ojos no se avanza: no se puede dar por cumplido lo que no se vio.
        if (izquierdo == null || derecho == null) return EstadoReto.EN_CURSO

        val abiertos = izquierdo >= umbrales.ojoAbierto && derecho >= umbrales.ojoAbierto
        val cerrados = izquierdo <= umbrales.ojoCerrado && derecho <= umbrales.ojoCerrado
        when (fase) {
            Fase.ESPERANDO_OJOS_ABIERTOS -> if (abiertos) fase = Fase.ESPERANDO_CIERRE
            Fase.ESPERANDO_CIERRE -> if (cerrados) fase = Fase.ESPERANDO_REAPERTURA
            Fase.ESPERANDO_REAPERTURA -> if (abiertos) return EstadoReto.CUMPLIDO
        }
        return EstadoReto.EN_CURSO
    }

    override fun reiniciar() {
        fase = Fase.ESPERANDO_OJOS_ABIERTOS
    }
}

/** De frente primero y luego girar la cabeza hacia cualquiera de los dos lados. */
class GiroCabezaReto(private val umbrales: UmbralesCaptura = UmbralesCaptura()) : RetoDeVida {
    private enum class Fase { ESPERANDO_FRENTE, ESPERANDO_GIRO }

    override val tipo = TipoReto.GIRO_CABEZA
    private var fase = Fase.ESPERANDO_FRENTE

    override fun procesar(rostro: ObservacionRostro): EstadoReto {
        val giro = abs(rostro.giroHorizontal)
        when (fase) {
            Fase.ESPERANDO_FRENTE -> if (giro <= umbrales.giroFrontalMaximo) fase = Fase.ESPERANDO_GIRO
            Fase.ESPERANDO_GIRO -> if (giro >= umbrales.giroDeRetoMinimo) return EstadoReto.CUMPLIDO
        }
        return EstadoReto.EN_CURSO
    }

    override fun reiniciar() {
        fase = Fase.ESPERANDO_FRENTE
    }
}
