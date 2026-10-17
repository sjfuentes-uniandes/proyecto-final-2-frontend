package com.solventa.core.designsystem

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Isotipo de Solventa (triángulo, engranaje y cuadrado) sobre un mosaico lavanda, como en los
 * mockups. Es una aproximación dibujada con formas: no hay un recurso vectorial del logotipo.
 * Es decorativo (la marca ya se anuncia como texto), por eso no expone semántica.
 */
@Composable
fun LogotipoSolventa(modifier: Modifier = Modifier, tamano: Dp = 96.dp) {
    val colores = SolventaTema.colores
    val relleno = colores.textoSecundario.copy(alpha = 0.4f)
    Box(
        modifier = modifier
            .size(tamano)
            .clip(RoundedCornerShape(tamano * 0.25f))
            .background(colores.panel)
            .clearAndSetSemantics { },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.size(tamano * 0.68f)) {
            val lado = size.minDimension
            dibujarTriangulo(lado, relleno)
            dibujarEngranaje(lado, relleno, colores.panel)
            drawRoundRect(
                color = relleno,
                topLeft = Offset(lado * 0.55f, lado * 0.57f),
                size = Size(lado * 0.4f, lado * 0.4f),
                cornerRadius = CornerRadius(lado * 0.08f),
            )
        }
    }
}

private fun DrawScope.dibujarTriangulo(lado: Float, color: androidx.compose.ui.graphics.Color) {
    val triangulo = Path().apply {
        moveTo(lado * 0.5f, lado * 0.06f)
        lineTo(lado * 0.74f, lado * 0.46f)
        lineTo(lado * 0.26f, lado * 0.46f)
        close()
    }
    // El trazo redondeado suaviza las esquinas, como en el mockup.
    drawPath(triangulo, color)
    drawPath(triangulo, color, style = Stroke(width = lado * 0.07f, join = StrokeJoin.Round))
}

private fun DrawScope.dibujarEngranaje(
    lado: Float,
    color: androidx.compose.ui.graphics.Color,
    fondo: androidx.compose.ui.graphics.Color,
) {
    val centro = Offset(lado * 0.27f, lado * 0.76f)
    val radioExterior = lado * 0.21f
    val radioInterior = radioExterior * 0.78f
    val dientes = 8
    val engranaje = Path().apply {
        for (i in 0 until dientes * 2) {
            val radio = if (i % 2 == 0) radioExterior else radioInterior
            val angulo = PI * i / dientes
            val punto = Offset(centro.x + (radio * cos(angulo)).toFloat(), centro.y + (radio * sin(angulo)).toFloat())
            if (i == 0) moveTo(punto.x, punto.y) else lineTo(punto.x, punto.y)
        }
        close()
    }
    drawPath(engranaje, color)
    drawCircle(color = fondo, radius = radioInterior * 0.42f, center = centro)
}
