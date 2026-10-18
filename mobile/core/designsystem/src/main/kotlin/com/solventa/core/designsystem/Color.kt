package com.solventa.core.designsystem

import androidx.compose.ui.graphics.Color

/**
 * Paleta de Solventa (ver mockups de ingreso/biometría): el "panel" lavanda agrupa los campos de
 * credenciales y el bloque de ingreso biométrico sobre un fondo blanco.
 */
data class SolventaColores(
    val fondo: Color,
    val panel: Color,
    val campoFondo: Color,
    val campoBorde: Color,
    val campoBiometria: Color,
    val textoPrimario: Color,
    val textoSecundario: Color,
    val acento: Color,
    val advertencia: Color,
    val exito: Color,
)

val coloresSolventaClaro = SolventaColores(
    fondo = Color(0xFFFFFFFF),
    panel = Color(0xFFF1ECFA),
    campoFondo = Color(0xFFFFFFFF),
    campoBorde = Color(0xFFD9D2EC),
    campoBiometria = Color(0xFFDDEFDF),
    textoPrimario = Color(0xFF1B1B1F),
    textoSecundario = Color(0xFF6F6D79),
    acento = Color(0xFF3A57E8),
    advertencia = Color(0xFFD32F2F),
    exito = Color(0xFF2E7D32),
)
