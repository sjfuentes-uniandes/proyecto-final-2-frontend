package com.solventa.feature.privacidad.ui

import androidx.annotation.StringRes
import com.solventa.feature.privacidad.R
import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Permiso
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/** Traducción de los tipos del dominio a recursos: la app nunca muestra textos del servidor. */

@StringRes
internal fun Permiso.nombreRes(): Int = when (this) {
    Permiso.DATOS_PERSONALES_FINANCIEROS -> R.string.privacidad_permiso_personales
    Permiso.OPEN_FINANCE_OPEN_DATA -> R.string.privacidad_permiso_open_finance
    Permiso.BIOMETRICOS_IDENTIDAD -> R.string.privacidad_permiso_biometricos
}

@StringRes
internal fun Permiso.descripcionRes(): Int = when (this) {
    Permiso.DATOS_PERSONALES_FINANCIEROS -> R.string.privacidad_permiso_personales_descripcion
    Permiso.OPEN_FINANCE_OPEN_DATA -> R.string.privacidad_permiso_open_finance_descripcion
    Permiso.BIOMETRICOS_IDENTIDAD -> R.string.privacidad_permiso_biometricos_descripcion
}

@StringRes
internal fun Alcance.nombreRes(): Int = when (this) {
    Alcance.FA_PRODUCTOS_VIGENTES -> R.string.privacidad_alcance_productos
    Alcance.FA_HISTORIAL_PAGOS_12M -> R.string.privacidad_alcance_historial
    Alcance.FA_INGRESOS_AGREGADOS -> R.string.privacidad_alcance_ingresos
    Alcance.DA_REGISTROS_PUBLICOS -> R.string.privacidad_alcance_registros
}

/** Un código que esta versión no conoce (backend más nuevo) no tiene recurso. */
internal fun alcanceRes(codigo: String): Int? = Alcance.entries.firstOrNull { it.name == codigo }?.nombreRes()

/** Estado de la etiqueta del permiso: `null` en el consentimiento es "sin otorgar". */
enum class EtiquetaEstado(@StringRes val textoRes: Int) {
    ACTIVA(R.string.privacidad_estado_activa),
    REVOCADA(R.string.privacidad_estado_revocada),
    VENCIDA(R.string.privacidad_estado_vencida),
    SIN_OTORGAR(R.string.privacidad_estado_sin_otorgar),
    DESCONOCIDA(R.string.privacidad_estado_desconocido),
    NO_DISPONIBLE(R.string.privacidad_estado_no_disponible),
}

internal fun EstadoConsentimiento?.etiqueta(): EtiquetaEstado = when (this) {
    null -> EtiquetaEstado.SIN_OTORGAR
    EstadoConsentimiento.ACTIVO -> EtiquetaEstado.ACTIVA
    EstadoConsentimiento.REVOCADO -> EtiquetaEstado.REVOCADA
    EstadoConsentimiento.VENCIDO -> EtiquetaEstado.VENCIDA
    EstadoConsentimiento.DESCONOCIDO -> EtiquetaEstado.DESCONOCIDA
}

/** Cuerpo del modal de error, por tipo de fallo (el título es siempre el del mockup). */
@StringRes
internal fun FalloConsentimiento.mensajeRes(): Int = when (this) {
    FalloConsentimiento.SinConexion -> R.string.privacidad_error_sin_conexion
    FalloConsentimiento.ServicioNoDisponible -> R.string.privacidad_error_servicio
    FalloConsentimiento.RespuestaInvalida -> R.string.privacidad_error_inesperado
    FalloConsentimiento.SesionVencida -> R.string.privacidad_error_sesion
    FalloConsentimiento.NoAutorizado -> R.string.privacidad_error_no_autorizado
    FalloConsentimiento.IdentidadNoVerificada -> R.string.privacidad_error_identidad
    FalloConsentimiento.ClienteNoEncontrado -> R.string.privacidad_error_cliente
    FalloConsentimiento.NoEncontrado -> R.string.privacidad_error_no_encontrado
    is FalloConsentimiento.YaVigente -> R.string.privacidad_ya_otorgada
    is FalloConsentimiento.SolicitudInvalida -> R.string.privacidad_error_solicitud_generica
    FalloConsentimiento.VigenciaInvalida -> R.string.privacidad_error_vigencia
    FalloConsentimiento.TextoNoVigente -> R.string.privacidad_error_texto
    FalloConsentimiento.IdempotenciaConflicto -> R.string.privacidad_error_conflicto
    FalloConsentimiento.PermisoNoDisponible -> R.string.privacidad_error_permiso
    is FalloConsentimiento.BiometriaNoConfirmada -> when (motivo) {
        ConfirmacionBiometrica.NO_DISPONIBLE -> R.string.privacidad_error_biometria_no_disponible
        ConfirmacionBiometrica.CANCELADA -> R.string.privacidad_biometria_cancelada
        ConfirmacionBiometrica.FALLIDA, ConfirmacionBiometrica.CONFIRMADA -> R.string.privacidad_error_biometria_fallida
    }
}

/** AC3: nombre legible de cada campo que el servidor informa como faltante o inválido. */
@StringRes
internal fun campoRes(campo: String): Int? = when (campo) {
    "proposito" -> R.string.privacidad_campo_proposito
    "alcances" -> R.string.privacidad_campo_datos
    "vigenciaMeses" -> R.string.privacidad_campo_vigencia
    "versionTexto", "idioma" -> R.string.privacidad_campo_texto
    else -> null
}

/** Fecha guardada en UTC, mostrada en la zona y el idioma del dispositivo. */
internal fun formatearFecha(instante: Instant, idioma: Locale, zona: ZoneId = ZoneId.systemDefault()): String =
    DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(idioma).withZone(zona).format(instante)

/** Idioma del texto legal (ADR 0005): en-US si la app está en inglés; es-CO en cualquier otro caso. */
internal fun idiomaTexto(idioma: Locale): String = if (idioma.language == Locale.ENGLISH.language) "en-US" else "es-CO"
