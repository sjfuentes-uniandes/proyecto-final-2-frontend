package com.solventa.feature.onboardingidentidad.ui

import androidx.annotation.StringRes
import com.solventa.feature.onboardingidentidad.R
import com.solventa.feature.onboardingidentidad.captura.CondicionCaptura
import com.solventa.feature.onboardingidentidad.captura.PasoCaptura
import com.solventa.feature.onboardingidentidad.captura.TipoReto
import com.solventa.feature.onboardingidentidad.verificacion.EtapaVerificacion
import com.solventa.feature.onboardingidentidad.verificacion.MotivoCapturaInvalida
import com.solventa.feature.onboardingidentidad.verificacion.MotivoRechazo

/** Texto de la guía en vivo durante la captura. */
@StringRes
internal fun recursoGuia(paso: PasoCaptura?): Int = when (paso) {
    null -> R.string.onboarding_guia_inicial
    is PasoCaptura.Guia -> recursoCondicion(paso.condicion)
    is PasoCaptura.Reto -> when (paso.tipo) {
        TipoReto.PARPADEO -> R.string.onboarding_reto_parpadeo
        TipoReto.GIRO_CABEZA -> R.string.onboarding_reto_giro
    }
    is PasoCaptura.RetoExpirado -> R.string.onboarding_reto_expirado
    PasoCaptura.Completado -> R.string.onboarding_guia_capturando
}

@StringRes
internal fun recursoCondicion(condicion: CondicionCaptura): Int = when (condicion) {
    CondicionCaptura.OK -> R.string.onboarding_guia_inicial
    CondicionCaptura.ILUMINACION_INSUFICIENTE -> R.string.onboarding_guia_iluminacion
    CondicionCaptura.SIN_ROSTRO -> R.string.onboarding_guia_sin_rostro
    CondicionCaptura.VARIOS_ROSTROS -> R.string.onboarding_guia_varios_rostros
    CondicionCaptura.ACERCAR_ROSTRO -> R.string.onboarding_guia_acercar
    CondicionCaptura.ALEJAR_ROSTRO -> R.string.onboarding_guia_alejar
    CondicionCaptura.CENTRAR_ROSTRO -> R.string.onboarding_guia_centrar
    CondicionCaptura.MIRAR_AL_FRENTE -> R.string.onboarding_guia_frente
    CondicionCaptura.ABRIR_OJOS -> R.string.onboarding_guia_ojos
}

/** Cómo repetir la captura (AC2) según el motivo que devolvió el proveedor. */
@StringRes
internal fun recursoSubtituloAdvertencia(motivo: MotivoCapturaInvalida): Int = when (motivo) {
    MotivoCapturaInvalida.ILUMINACION_INSUFICIENTE -> R.string.onboarding_advertencia_iluminacion
    MotivoCapturaInvalida.OTRO -> R.string.onboarding_advertencia_subtitulo
}

/** Botones posibles de una pantalla de resultado; la ruta decide qué hace cada uno. */
internal enum class AccionResultado(@StringRes val texto: Int) {
    CONTINUAR(R.string.onboarding_boton_continuar),
    REINTENTAR(R.string.onboarding_boton_reintentar),
    INTENTAR_DE_NUEVO(R.string.onboarding_boton_intentar_de_nuevo),
    IR_A_INGRESO(R.string.onboarding_boton_ir_a_ingreso),
    CANCELAR(R.string.onboarding_boton_cancelar),
}

internal enum class TipoResultado { EXITO, INTERRUPCION, ADVERTENCIA }

internal data class ContenidoResultado(
    @StringRes val titulo: Int,
    @StringRes val mensaje: Int,
    val tipo: TipoResultado,
    val correlationId: String?,
    val principal: AccionResultado,
    val secundaria: AccionResultado?,
)

/** Qué mostrar para una etapa que termina en una pantalla de resultado; null si no lo es. */
internal fun contenidoResultado(etapa: EtapaVerificacion): ContenidoResultado? = when (etapa) {
    is EtapaVerificacion.Aprobada -> ContenidoResultado(
        titulo = R.string.onboarding_aprobada_titulo,
        mensaje = R.string.onboarding_aprobada_mensaje,
        tipo = TipoResultado.EXITO,
        correlationId = null,
        principal = AccionResultado.CONTINUAR,
        secundaria = null,
    )
    is EtapaVerificacion.Rechazada -> ContenidoResultado(
        titulo = R.string.onboarding_rechazada_titulo,
        mensaje = when (etapa.motivo) {
            MotivoRechazo.ROSTRO_NO_COINCIDE -> R.string.onboarding_rechazada_rostro
            MotivoRechazo.OTRO -> R.string.onboarding_rechazada_generico
        },
        tipo = TipoResultado.ADVERTENCIA,
        correlationId = null,
        principal = AccionResultado.INTENTAR_DE_NUEVO,
        secundaria = AccionResultado.CANCELAR,
    )
    is EtapaVerificacion.Interrumpida -> ContenidoResultado(
        titulo = R.string.onboarding_interrumpida_titulo,
        mensaje = R.string.onboarding_interrumpida_mensaje,
        tipo = TipoResultado.INTERRUPCION,
        correlationId = etapa.correlationId,
        principal = AccionResultado.REINTENTAR,
        secundaria = AccionResultado.CANCELAR,
    )
    EtapaVerificacion.CorreoDistinto -> ContenidoResultado(
        titulo = R.string.onboarding_correo_distinto_titulo,
        mensaje = R.string.onboarding_correo_distinto_mensaje,
        tipo = TipoResultado.ADVERTENCIA,
        correlationId = null,
        principal = AccionResultado.INTENTAR_DE_NUEVO,
        secundaria = AccionResultado.CANCELAR,
    )
    EtapaVerificacion.CuentaExistente -> ContenidoResultado(
        titulo = R.string.onboarding_cuenta_existente_titulo,
        mensaje = R.string.onboarding_cuenta_existente_mensaje,
        tipo = TipoResultado.ADVERTENCIA,
        correlationId = null,
        principal = AccionResultado.IR_A_INGRESO,
        secundaria = AccionResultado.CANCELAR,
    )
    is EtapaVerificacion.ErrorInesperado -> ContenidoResultado(
        titulo = R.string.onboarding_error_titulo,
        mensaje = R.string.onboarding_error_mensaje,
        tipo = TipoResultado.ADVERTENCIA,
        correlationId = etapa.correlationId,
        principal = AccionResultado.INTENTAR_DE_NUEVO,
        secundaria = AccionResultado.CANCELAR,
    )
    else -> null
}
