package com.solventa.feature.billetera

/**
 * `testTag` de las pantallas de la billetera. No son texto visible ni se anuncian; viven fuera de
 * los archivos de composables para no confundirse con literales de texto.
 */
object EtiquetasPrueba {
    const val CARGANDO = "billetera.cargando"
    const val ERROR = "billetera.error"
    const val VACIA = "billetera.vacia"
    const val LISTA = "billetera.lista"
    const val ACCESO_PRIVACIDAD = "billetera.acceso_privacidad"
    const val DETALLE = "billetera.detalle"
    const val CREDENCIAL = "billetera.credencial"
    const val COBERTURAS = "billetera.coberturas"
    const val NO_AUTORIZADA = "billetera.no_autorizada"
    const val NO_ENCONTRADA = "billetera.no_encontrada"

    fun poliza(polizaId: String) = "billetera.poliza.$polizaId"
}
