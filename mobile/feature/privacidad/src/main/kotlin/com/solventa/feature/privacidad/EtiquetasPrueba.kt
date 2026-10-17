package com.solventa.feature.privacidad

/**
 * `testTag` de las pantallas de Privacidad. No son texto visible ni se anuncian; viven fuera del
 * paquete `ui` para que la prueba de literales de ese paquete no tenga excepciones.
 */
object EtiquetasPrueba {
    const val CARGANDO = "privacidad.cargando"
    const val ERROR_CARGA = "privacidad.error_carga"
    const val BOTON_OTORGAR = "privacidad.boton_otorgar"
    const val COMPROBANTE = "privacidad.comprobante"
    const val DIALOGO_ERROR = "privacidad.dialogo_error"
    const val AVISO = "privacidad.aviso"

    fun permiso(nombre: String) = "privacidad.permiso.$nombre"

    fun alcance(nombre: String) = "privacidad.alcance.$nombre"

    fun vigencia(meses: Int) = "privacidad.vigencia.$meses"
}
