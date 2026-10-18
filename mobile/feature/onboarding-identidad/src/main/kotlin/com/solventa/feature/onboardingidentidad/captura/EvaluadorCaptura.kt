package com.solventa.feature.onboardingidentidad.captura

import kotlin.math.abs

/** Decide si un cuadro cumple las condiciones mínimas de iluminación y encuadre. */
class EvaluadorCaptura(private val umbrales: UmbralesCaptura = UmbralesCaptura()) {

    /**
     * [exigirFrontal] y [exigirOjosAbiertos] se piden solo para el cuadro que se va a enviar; durante
     * el reto de vida el rostro puede estar girado o con los ojos cerrados.
     */
    fun evaluar(
        frame: ObservacionFrame,
        exigirFrontal: Boolean = false,
        exigirOjosAbiertos: Boolean = false,
    ): CondicionCaptura {
        if (frame.luminosidad < umbrales.luminosidadMinima) return CondicionCaptura.ILUMINACION_INSUFICIENTE
        if (frame.rostros.isEmpty()) return CondicionCaptura.SIN_ROSTRO
        if (frame.rostros.size > 1) return CondicionCaptura.VARIOS_ROSTROS

        val rostro = frame.rostros.single()
        return when {
            rostro.anchoRelativo < umbrales.anchoMinimo -> CondicionCaptura.ACERCAR_ROSTRO
            rostro.anchoRelativo > umbrales.anchoMaximo -> CondicionCaptura.ALEJAR_ROSTRO
            abs(rostro.centroX - 0.5f) > umbrales.desvioCentroMaximo ||
                abs(rostro.centroY - 0.5f) > umbrales.desvioCentroMaximo -> CondicionCaptura.CENTRAR_ROSTRO
            exigirFrontal && !esFrontal(rostro) -> CondicionCaptura.MIRAR_AL_FRENTE
            exigirOjosAbiertos && !ojosAbiertos(rostro) -> CondicionCaptura.ABRIR_OJOS
            else -> CondicionCaptura.OK
        }
    }

    private fun esFrontal(rostro: ObservacionRostro): Boolean =
        abs(rostro.giroHorizontal) <= umbrales.giroFrontalMaximo &&
            abs(rostro.inclinacion) <= umbrales.inclinacionMaxima

    // Si ML Kit no pudo estimar los ojos, no se da por válida la captura.
    private fun ojosAbiertos(rostro: ObservacionRostro): Boolean {
        val izquierdo = rostro.probOjoIzquierdoAbierto ?: return false
        val derecho = rostro.probOjoDerechoAbierto ?: return false
        return izquierdo >= umbrales.ojoAbierto && derecho >= umbrales.ojoAbierto
    }
}
