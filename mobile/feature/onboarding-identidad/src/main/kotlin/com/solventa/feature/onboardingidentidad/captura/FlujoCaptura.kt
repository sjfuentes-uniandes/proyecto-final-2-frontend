package com.solventa.feature.onboardingidentidad.captura

/** Lo que la UI debe mostrar tras analizar un cuadro. */
sealed interface PasoCaptura {
    /** No se cumplen las condiciones mínimas: la UI explica qué corregir. */
    data class Guia(val condicion: CondicionCaptura) : PasoCaptura

    /** Hay que cumplir el reto de vida indicado. */
    data class Reto(val tipo: TipoReto) : PasoCaptura

    /** El reto no se cumplió a tiempo; arranca otro. */
    data class RetoExpirado(val tipo: TipoReto) : PasoCaptura

    /** Reto cumplido y este cuadro es válido: es el que se debe capturar. */
    data object Completado : PasoCaptura
}

/**
 * Orquesta la captura: primero el reto de vida y después un cuadro frontal, con los ojos abiertos
 * y bien encuadrado, que es el que se envía. Si en ese último tramo desaparece el rostro o aparece
 * otro, se vuelve a empezar para que la prueba de vida y la selfie sean de la misma persona.
 */
class FlujoCaptura(
    private val umbrales: UmbralesCaptura = UmbralesCaptura(),
    private val evaluador: EvaluadorCaptura = EvaluadorCaptura(umbrales),
    private val elegirReto: () -> RetoDeVida = { if ((0..1).random() == 0) ParpadeoReto(umbrales) else GiroCabezaReto(umbrales) },
) {
    private enum class Fase { RETO, CAPTURA_FRONTAL, COMPLETADO }

    private var fase = Fase.RETO
    private var reto = elegirReto()
    private var inicioRetoMs: Long? = null

    /** Reinicia todo para un nuevo intento. */
    fun reiniciar() {
        fase = Fase.RETO
        reto = elegirReto()
        inicioRetoMs = null
    }

    fun procesar(frame: ObservacionFrame): PasoCaptura = when (fase) {
        Fase.COMPLETADO -> PasoCaptura.Completado
        Fase.RETO -> procesarReto(frame)
        Fase.CAPTURA_FRONTAL -> procesarCapturaFrontal(frame)
    }

    private fun procesarReto(frame: ObservacionFrame): PasoCaptura {
        val condicion = evaluador.evaluar(frame)
        if (condicion != CondicionCaptura.OK) {
            reiniciarReto()
            return PasoCaptura.Guia(condicion)
        }

        val inicio = inicioRetoMs ?: frame.tiempoMs.also { inicioRetoMs = it }
        if (frame.tiempoMs - inicio > umbrales.duracionRetoMs) {
            val expirado = reto.tipo
            reto = elegirReto()
            inicioRetoMs = null
            return PasoCaptura.RetoExpirado(expirado)
        }

        if (reto.procesar(frame.rostros.single()) == EstadoReto.EN_CURSO) return PasoCaptura.Reto(reto.tipo)
        fase = Fase.CAPTURA_FRONTAL
        return procesarCapturaFrontal(frame)
    }

    private fun procesarCapturaFrontal(frame: ObservacionFrame): PasoCaptura {
        val condicion = evaluador.evaluar(frame, exigirFrontal = true, exigirOjosAbiertos = true)
        return when (condicion) {
            CondicionCaptura.OK -> {
                fase = Fase.COMPLETADO
                PasoCaptura.Completado
            }
            CondicionCaptura.SIN_ROSTRO, CondicionCaptura.VARIOS_ROSTROS -> {
                reiniciar()
                PasoCaptura.Guia(condicion)
            }
            else -> PasoCaptura.Guia(condicion)
        }
    }

    private fun reiniciarReto() {
        reto.reiniciar()
        inicioRetoMs = null
    }
}
