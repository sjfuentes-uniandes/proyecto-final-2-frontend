package com.solventa.feature.privacidad

import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.TextoVigente

/** Estado de una lectura del servidor. */
sealed interface Carga<out T> {
    data object Inactiva : Carga<Nothing>

    data object Cargando : Carga<Nothing>

    data class Lista<T>(val valor: T) : Carga<T>

    data class Error(val fallo: FalloConsentimiento) : Carga<Nothing>
}

sealed interface EstadoOtorgamiento {
    data object Inactivo : EstadoOtorgamiento

    data object EnCurso : EstadoOtorgamiento

    /** AC1: la UI muestra el comprobante; `repeticion` si era el mismo intento (AC4). */
    data class Otorgado(val consentimiento: Consentimiento, val repeticion: Boolean) : EstadoOtorgamiento

    /** `fallo.reintentable`: la UI ofrece reintentar, con la misma clave. */
    data class Fallido(val fallo: FalloConsentimiento) : EstadoOtorgamiento
}

sealed interface EstadoRevocacion {
    data object Inactivo : EstadoRevocacion

    data object EnCurso : EstadoRevocacion

    /**
     * El servidor respondió 200 con el estado resultante, sin reinterpretarlo: `REVOCADO`, o
     * `VENCIDO` con `revocadoEn` nulo si ya no estaba vigente (HU-M09).
     */
    data class Resuelto(val consentimiento: Consentimiento) : EstadoRevocacion

    /** `fallo.reintentable`: la UI ofrece reintentar; repetir es seguro (idempotente por estado). */
    data class Fallido(val fallo: FalloConsentimiento) : EstadoRevocacion
}

/** Estado del módulo de Privacidad (HU-M08 y HU-M09). Sin textos: la UI los resuelve por tipo e idioma. */
data class PrivacidadUiState(
    /** Los tres permisos del mockup; los no soportados se muestran deshabilitados (ADR 0001). */
    val permisos: List<Permiso> = Permiso.entries,
    val consentimientos: Carga<List<Consentimiento>> = Carga.Inactiva,
    val texto: Carga<TextoVigente> = Carga.Inactiva,
    val detalle: Carga<Consentimiento> = Carga.Inactiva,
    val otorgamiento: EstadoOtorgamiento = EstadoOtorgamiento.Inactivo,
    val historial: Carga<Historial> = Carga.Inactiva,
    val revocacion: EstadoRevocacion = EstadoRevocacion.Inactivo,
) {
    fun puedeOtorgar(permiso: Permiso): Boolean =
        permiso.soportado && otorgamiento != EstadoOtorgamiento.EnCurso
}
