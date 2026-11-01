package com.solventa.feature.billetera.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.billetera.DetallePolizaUiState

/** Previews de [DetallePolizaScreen]. Solo variante debug. */
@Preview(name = "Detalle · activa", showBackground = true)
@Composable
private fun DetalleActiva() = SolventaTheme { DetallePolizaScreen(DetallePolizaUiState.Contenido(MuestrasPreview.detalle), {}, {}) }

@Preview(name = "Detalle · vencida", showBackground = true)
@Composable
private fun DetalleVencida() = SolventaTheme {
    DetallePolizaScreen(
        DetallePolizaUiState.Contenido(MuestrasPreview.detalle.copy(vigente = false, estado = "VENCIDA")),
        {},
        {},
    )
}

@Preview(name = "Detalle · no autorizada", showBackground = true)
@Composable
private fun DetalleNoAutorizada() = SolventaTheme { DetallePolizaScreen(DetallePolizaUiState.NoAutorizada, {}, {}) }

@Preview(name = "Detalle · error", showBackground = true)
@Composable
private fun DetalleError() = SolventaTheme { DetallePolizaScreen(DetallePolizaUiState.Error, {}, {}) }

@Preview(name = "Detalle · activa · en-US", showBackground = true, locale = "en-rUS")
@Composable
private fun DetalleActivaEnUs() = SolventaTheme { DetallePolizaScreen(DetallePolizaUiState.Contenido(MuestrasPreview.detalle), {}, {}) }
