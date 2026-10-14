package com.solventa.feature.login

/**
 * Mensaje de advertencia en rojo que acompaña el formulario (ver mockups de reintento y límite
 * de intentos biométricos). El texto va fijo porque debe calzar exactamente con el prototipo (AC5).
 */
sealed class MensajeLogin(val titulo: String, val subtitulo: String) {
    data object ReintentarBiometria : MensajeLogin(
        titulo = "Repetir comprobación biométrica",
        subtitulo = "Evite el uso de anteojos y cubrebocas durante la captura",
    )

    data object LimiteBiometriaSuperado : MensajeLogin(
        titulo = "Límite de intentos biométricos superados",
        subtitulo = "Ingrese por favor con usuario y contraseña",
    )

    /** AC4: el servidor ya no reconoce la sesión que la biometría acababa de desbloquear. */
    data object SesionRevocada : MensajeLogin(
        titulo = "Su sesión ya no es válida",
        subtitulo = "Ingrese por favor con usuario y contraseña",
    )
}
