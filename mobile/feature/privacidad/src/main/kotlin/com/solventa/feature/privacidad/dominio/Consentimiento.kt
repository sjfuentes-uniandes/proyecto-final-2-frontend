package com.solventa.feature.privacidad.dominio

import java.time.Instant

/** Único propósito del módulo (ADR 0001). */
const val PROPOSITO_PERFILAMIENTO = "PERFILAMIENTO_PRECIO"

/** Alcances que el cliente puede elegir, al menos uno (P1-4; contracts/alcances-perfilamiento.json). */
enum class Alcance {
    FA_PRODUCTOS_VIGENTES,
    FA_HISTORIAL_PAGOS_12M,
    FA_INGRESOS_AGREGADOS,
    DA_REGISTROS_PUBLICOS,
}

/**
 * Permisos que muestra el panel de Privacidad. Solo Open Finance y Open Data se puede otorgar
 * (ADR 0001); los otros dos se muestran deshabilitados, sin llamada al backend.
 */
enum class Permiso(val soportado: Boolean) {
    DATOS_PERSONALES_FINANCIEROS(soportado = false),
    OPEN_FINANCE_OPEN_DATA(soportado = true),
    BIOMETRICOS_IDENTIDAD(soportado = false),
}

/** `DESCONOCIDO`: un estado que esta versión de la app no conoce (backend más nuevo). */
enum class EstadoConsentimiento {
    ACTIVO,
    REVOCADO,
    VENCIDO,
    DESCONOCIDO,
}

/**
 * Consentimiento del titular tal como lo devuelve el servidor. Las fechas son instantes UTC; la
 * zona del usuario la aplica la presentación. `alcances` son códigos: uno que esta versión no
 * conozca se conserva en el comprobante en lugar de perderse.
 */
data class Consentimiento(
    val id: String,
    val estado: EstadoConsentimiento,
    val proposito: String,
    val alcances: List<String>,
    val versionTexto: String,
    val idioma: String,
    val otorgadoEn: Instant,
    val vigenteHasta: Instant,
    val revocadoEn: Instant?,
)

/** Texto de ejemplo vigente, sin validez legal, con las vigencias que acepta el servidor (ADR 0005). */
data class TextoVigente(
    val proposito: String,
    val idioma: String,
    val versionTexto: String,
    val titulo: String,
    val cuerpo: String,
    val aviso: String,
    val vigenciasMeses: List<Int>,
    val vigenciaDefectoMeses: Int,
)

/**
 * Lo que el cliente confirma. La validación de fondo (alcances, vigencia, versión del texto) es del
 * servidor (AC3); la app solo impide otorgar un permiso no soportado.
 */
data class SolicitudOtorgamiento(
    val permiso: Permiso,
    val alcances: Set<Alcance>,
    val vigenciaMeses: Int,
    val versionTexto: String,
    val idioma: String,
)

/** `repeticion`: el servidor devolvió el consentimiento ya creado con la misma clave (AC4). */
data class Otorgamiento(val consentimiento: Consentimiento, val repeticion: Boolean)

/** `DESCONOCIDO`: un tipo de hito que esta versión de la app no conoce (backend más nuevo). */
enum class TipoHito {
    OTORGADO,
    REVOCADO,
    VENCIDO,
    DESCONOCIDO,
}

/** Un momento del historial, como instante UTC. */
data class Hito(val tipo: TipoHito, val ocurridoEn: Instant)

/**
 * Historial de un consentimiento (HU-M09 AC4): lo deriva el servidor de un registro que no se puede
 * modificar; la app solo lo muestra.
 */
data class Historial(
    val consentimientoId: String,
    val estado: EstadoConsentimiento,
    val hitos: List<Hito>,
)
