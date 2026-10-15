package com.solventa.feature.login

import androidx.annotation.StringRes

/**
 * Mensaje de advertencia en rojo que acompaña el formulario (ver mockups de reintento y límite
 * de intentos biométricos). El texto vive en `res/values/strings.xml` (con traducción en-US).
 */
sealed class MensajeLogin(@StringRes val tituloRes: Int, @StringRes val subtituloRes: Int) {
    data object ReintentarBiometria : MensajeLogin(
        tituloRes = R.string.login_mensaje_reintentar_titulo,
        subtituloRes = R.string.login_mensaje_reintentar_subtitulo,
    )

    data object LimiteBiometriaSuperado : MensajeLogin(
        tituloRes = R.string.login_mensaje_limite_titulo,
        subtituloRes = R.string.login_mensaje_limite_subtitulo,
    )

    /** AC4: el servidor (bff-movil) ya no reconoce la sesión que la biometría desbloqueó. */
    data object SesionRevocada : MensajeLogin(
        tituloRes = R.string.login_mensaje_revocada_titulo,
        subtituloRes = R.string.login_mensaje_revocada_subtitulo,
    )

    /** `GET /v1/sesion` falló por algo distinto a 401 (red, 503, etc.): no es una revocación. */
    data object ErrorVerificacion : MensajeLogin(
        tituloRes = R.string.login_mensaje_error_verificacion_titulo,
        subtituloRes = R.string.login_mensaje_error_verificacion_subtitulo,
    )
}
