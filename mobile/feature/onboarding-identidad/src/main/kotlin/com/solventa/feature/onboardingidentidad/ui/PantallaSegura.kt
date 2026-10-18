package com.solventa.feature.onboardingidentidad.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext

/**
 * Mientras [activa], la ventana se marca como segura (`FLAG_SECURE`): Android impide las capturas y
 * grabaciones de pantalla y oculta el contenido en la miniatura de apps recientes. Se usa en toda
 * la verificación biométrica, donde se ve el rostro de la persona (AC4). El indicador se retira al
 * salir para no afectar al resto de la app.
 */
@Composable
internal fun PantallaSegura(activa: Boolean) {
    val contexto = LocalContext.current
    DisposableEffect(activa) {
        val ventana = if (activa) contexto.buscarActividad()?.window else null
        ventana?.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        onDispose { ventana?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE) }
    }
}

internal tailrec fun Context.buscarActividad(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.buscarActividad()
    else -> null
}
