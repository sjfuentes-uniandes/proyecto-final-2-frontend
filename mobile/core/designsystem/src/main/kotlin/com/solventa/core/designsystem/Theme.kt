package com.solventa.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

val LocalSolventaColores = staticCompositionLocalOf { coloresSolventaClaro }

/** Acceso de solo lectura a la paleta vigente, p. ej. `SolventaTema.colores.panel`. */
object SolventaTema {
    val colores: SolventaColores
        @Composable get() = LocalSolventaColores.current
}

@Composable
fun SolventaTheme(content: @Composable () -> Unit) {
    val colores = coloresSolventaClaro
    val esquemaColor = lightColorScheme(
        primary = colores.acento,
        onPrimary = Color.White,
        background = colores.fondo,
        surface = colores.fondo,
        error = colores.advertencia,
    )
    CompositionLocalProvider(LocalSolventaColores provides colores) {
        MaterialTheme(colorScheme = esquemaColor, content = content)
    }
}
