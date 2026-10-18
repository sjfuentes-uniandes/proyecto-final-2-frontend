package com.solventa.core.designsystem

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration

/**
 * Advertencia en rojo de dos líneas (título en negrita y subtítulo subrayado), como en los mockups
 * de reintento biométrico. Se anuncia sola a los lectores de pantalla cuando aparece.
 */
@Composable
fun TextoAdvertencia(titulo: String, subtitulo: String, modifier: Modifier = Modifier) {
    val colores = SolventaTema.colores
    Column(modifier = modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
        Text(
            text = titulo,
            color = colores.advertencia,
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(
            text = subtitulo,
            color = colores.advertencia,
            style = MaterialTheme.typography.bodySmall,
            textDecoration = TextDecoration.Underline,
        )
    }
}
