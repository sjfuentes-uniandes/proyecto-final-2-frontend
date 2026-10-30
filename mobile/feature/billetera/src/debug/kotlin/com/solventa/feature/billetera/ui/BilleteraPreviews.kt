package com.solventa.feature.billetera.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.billetera.BilleteraUiState

/** Previews de [BilleteraScreen]. Solo variante debug. */
@Preview(name = "Billetera · activa y vencida", showBackground = true)
@Composable
private fun BilleteraActivaYVencida() = SolventaTheme {
    BilleteraScreen(BilleteraUiState.Contenido(listOf(MuestrasPreview.activa, MuestrasPreview.vencidaResumen)), {}, {}, {})
}

@Preview(name = "Billetera · vacía", showBackground = true)
@Composable
private fun BilleteraVacia() = SolventaTheme { BilleteraScreen(BilleteraUiState.Vacia, {}, {}, {}) }

@Preview(name = "Billetera · error", showBackground = true)
@Composable
private fun BilleteraError() = SolventaTheme { BilleteraScreen(BilleteraUiState.SinConexion, {}, {}, {}) }

@Preview(name = "Billetera · activa · en-US", showBackground = true, locale = "en-rUS")
@Composable
private fun BilleteraActivaEnUs() = SolventaTheme {
    BilleteraScreen(BilleteraUiState.Contenido(listOf(MuestrasPreview.activa)), {}, {}, {})
}

@Preview(name = "Billetera · activa · fuente 200 %", showBackground = true, fontScale = 2f)
@Composable
private fun BilleteraFuenteGrande() = SolventaTheme {
    BilleteraScreen(BilleteraUiState.Contenido(listOf(MuestrasPreview.activa)), {}, {}, {})
}
