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
    const val BOTON_REVOCAR = "privacidad.boton_revocar"
    const val DIALOGO_CONFIRMAR_REVOCAR = "privacidad.dialogo_confirmar_revocar"
    const val HISTORIAL = "privacidad.historial"

    fun permiso(nombre: String) = "privacidad.permiso.$nombre"

    fun alcance(nombre: String) = "privacidad.alcance.$nombre"

    fun vigencia(meses: Int) = "privacidad.vigencia.$meses"

    fun anterior(id: String) = "privacidad.anterior.$id"
}
