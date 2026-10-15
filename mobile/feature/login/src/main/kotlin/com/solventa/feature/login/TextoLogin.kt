package com.solventa.feature.login

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource

/**
 * Texto a mostrar en la pantalla de ingreso: casi siempre un recurso traducible
 * ([Recurso]), salvo los mensajes de diagnóstico que no se pueden traducir de antemano
 * (p. ej. un error de configuración o el mensaje crudo de una excepción) ([Dinamico]).
 */
sealed class TextoLogin {
    data class Recurso(@StringRes val id: Int) : TextoLogin()

    data class Dinamico(val texto: String) : TextoLogin()
}

@Composable
fun TextoLogin.textoResuelto(): String = when (this) {
    is TextoLogin.Recurso -> stringResource(id)
    is TextoLogin.Dinamico -> texto
}
