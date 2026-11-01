package com.solventa.feature.billetera.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.billetera.EtiquetasPrueba
import com.solventa.feature.billetera.R
import java.math.BigDecimal

internal val AREA_TACTIL_MINIMA = 48.dp

private val azulBarra = Color(0xFF0F2A55)

/**
 * Barra superior. Con [onVolver] muestra la flecha atrás; con [onAbrirPrivacidad] muestra el acceso
 * provisional a Privacidad. El título puede ocupar varias líneas con fuente grande.
 */
@Composable
internal fun BarraBilletera(
    titulo: String,
    onVolver: (() -> Unit)? = null,
    onAbrirPrivacidad: (() -> Unit)? = null,
) {
    val oscura = onVolver == null
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (oscura) azulBarra else SolventaTema.colores.fondo)
            .heightIn(min = 64.dp)
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (onVolver != null) {
            IconButton(onClick = onVolver, modifier = Modifier.size(AREA_TACTIL_MINIMA)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.billetera_volver))
            }
        }
        Text(
            titulo,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = if (oscura) Color.White else SolventaTema.colores.textoPrimario,
            modifier = Modifier
                .weight(1f)
                .semantics { heading() },
        )
        if (onAbrirPrivacidad != null) {
            // Provisional hasta HU-M08: no hay barra inferior ni inicio desde donde llegar a Privacidad.
            IconButton(
                onClick = onAbrirPrivacidad,
                modifier = Modifier
                    .size(AREA_TACTIL_MINIMA)
                    .testTag(EtiquetasPrueba.ACCESO_PRIVACIDAD),
            ) {
                Icon(
                    Icons.Filled.Shield,
                    contentDescription = stringResource(R.string.billetera_privacidad_acceso),
                    tint = Color.White,
                )
            }
        }
    }
}

/**
 * Chip "ACTIVA"/"VENCIDA": el texto la identifica y el color solo refuerza. [anunciar] la lee como
 * "Estado: activa"; en la tarjeta se desactiva porque la tarjeta ya anuncia el estado.
 */
@Composable
internal fun ChipEstadoPoliza(vigente: Boolean, modifier: Modifier = Modifier, anunciar: Boolean = true) {
    val (fondo, texto) = if (vigente) {
        Color(0xFFE3F4EA) to Color(0xFF1B6B3A)
    } else {
        Color(0xFFFDE7E6) to Color(0xFFB3261E)
    }
    val descripcion = stringResource(descripcionEstadoRes(vigente))
    Text(
        stringResource(textoEstadoRes(vigente)),
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
        color = texto,
        modifier = modifier
            .background(fondo, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp)
            .semantics { if (anunciar) contentDescription = descripcion },
    )
}

/** Indicador de carga anunciado por el lector de pantalla. */
@Composable
internal fun CargandoBilletera() {
    val texto = stringResource(R.string.billetera_cargando)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
            .testTag(EtiquetasPrueba.CARGANDO)
            .semantics(mergeDescendants = true) {
                contentDescription = texto
                liveRegion = LiveRegionMode.Polite
            },
        horizontalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
    }
}

/** Mensaje anunciado y, si [onReintentar] no es nulo, botón para reintentar. */
@Composable
internal fun MensajeBilletera(texto: String, etiqueta: String, onReintentar: (() -> Unit)? = null) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
            .testTag(etiqueta),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            texto,
            style = MaterialTheme.typography.bodyLarge,
            color = SolventaTema.colores.textoPrimario,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
        )
        if (onReintentar != null) {
            OutlinedButton(onClick = onReintentar, modifier = Modifier.heightIn(min = AREA_TACTIL_MINIMA)) {
                Text(stringResource(R.string.billetera_reintentar))
            }
        }
    }
}

/** Tarjeta con título, como las secciones del carné digital. */
@Composable
internal fun SeccionBilletera(titulo: String, modifier: Modifier = Modifier, contenido: @Composable () -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, SolventaTema.colores.campoBorde, RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            titulo,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = SolventaTema.colores.textoPrimario,
            modifier = Modifier.semantics { heading() },
        )
        contenido()
    }
}

/** Monto con la moneda en el formato del idioma del dispositivo (es-CO: `$ 300.000.000 COP`). */
@Composable
internal fun montoTexto(monto: BigDecimal, moneda: String): String =
    stringResource(R.string.billetera_monto, formatearMonto(monto, LocalConfiguration.current.locales[0]), moneda)

@StringRes
internal fun textoEstadoRes(vigente: Boolean): Int =
    if (vigente) R.string.billetera_estado_activa else R.string.billetera_estado_vencida

@StringRes
internal fun descripcionEstadoRes(vigente: Boolean): Int =
    if (vigente) R.string.billetera_estado_activa_descripcion else R.string.billetera_estado_vencida_descripcion
