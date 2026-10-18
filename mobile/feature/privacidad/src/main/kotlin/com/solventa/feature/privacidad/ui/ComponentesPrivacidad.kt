package com.solventa.feature.privacidad.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.R
import com.solventa.feature.privacidad.Carga
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial

/** Área táctil mínima de las guías de Android. */
internal val AREA_TACTIL_MINIMA = 48.dp

private val azulBarra = Color(0xFF0F2A55)
private val verdeAccion = Color(0xFF136B63)
private val rojoRevocar = Color(0xFFD7261E)

/** Barra superior: con [onVolver] muestra la flecha atrás (con descripción para el lector). */
@Composable
internal fun BarraPrivacidad(titulo: String, onVolver: (() -> Unit)? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (onVolver == null) azulBarra else SolventaTema.colores.fondo)
            .heightIn(min = 64.dp)
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (onVolver != null) {
            IconButton(onClick = onVolver, modifier = Modifier.size(AREA_TACTIL_MINIMA)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.privacidad_volver))
            }
        } else {
            // Decorativo: el título ya dice qué es la pantalla.
            Icon(Icons.Filled.Shield, contentDescription = null, tint = Color.White, modifier = Modifier.padding(8.dp))
        }
        Text(
            titulo,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = if (onVolver == null) Color.White else SolventaTema.colores.textoPrimario,
            modifier = Modifier.semantics { heading() },
        )
    }
}

/** Etiqueta de estado: el texto la identifica; el color solo refuerza (no depende de él). */
@Composable
internal fun EtiquetaEstadoPermiso(etiqueta: EtiquetaEstado, modifier: Modifier = Modifier) {
    val (fondo, texto) = when (etiqueta) {
        EtiquetaEstado.ACTIVA -> Color(0xFFE3F4EA) to Color(0xFF1B6B3A)
        EtiquetaEstado.REVOCADA -> Color(0xFFFDE7E6) to Color(0xFFB3261E)
        else -> Color(0xFFEDEDF2) to Color(0xFF45444F)
    }
    Text(
        stringResource(etiqueta.textoRes),
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
        color = texto,
        modifier = modifier
            .background(fondo, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

/** Tarjeta con título en mayúsculas (PROPÓSITO, DATOS SOLICITADOS, VIGENCIA), como el mockup. */
@Composable
internal fun SeccionPrivacidad(titulo: String, contenido: @Composable () -> Unit) {
    Column(
        modifier = Modifier
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

/** Indicador de carga anunciado por el lector de pantalla. */
@Composable
internal fun CargandoPrivacidad() {
    val texto = stringResource(R.string.privacidad_cargando)
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

/** Una lectura falló: mensaje anunciado y botón para reintentar. */
@Composable
internal fun ErrorCargaPrivacidad(onReintentar: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
            .testTag(EtiquetasPrueba.ERROR_CARGA),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            stringResource(R.string.privacidad_error_carga),
            color = SolventaTema.colores.advertencia,
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
        )
        OutlinedButton(onClick = onReintentar, modifier = Modifier.heightIn(min = AREA_TACTIL_MINIMA)) {
            Text(stringResource(R.string.privacidad_reintentar))
        }
    }
}

/** Aviso informativo (no es un error): se anuncia sin interrumpir. */
@Composable
internal fun AvisoPrivacidad(texto: String) {
    Text(
        texto,
        style = MaterialTheme.typography.bodyMedium,
        color = SolventaTema.colores.textoPrimario,
        modifier = Modifier
            .fillMaxWidth()
            .background(SolventaTema.colores.panel, RoundedCornerShape(12.dp))
            .padding(12.dp)
            .testTag(EtiquetasPrueba.AVISO)
            .semantics { liveRegion = LiveRegionMode.Polite },
    )
}

/**
 * Botón principal del mockup: verde para "OTORGAR AUTORIZACIÓN" y rojo para "REVOCAR AUTORIZACIÓN"
 * ([peligro], mockup_1_HUM09.png). El texto dice siempre la acción: el color solo refuerza.
 */
@Composable
internal fun BotonPrincipal(
    texto: String,
    habilitado: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    peligro: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = habilitado,
        shape = RoundedCornerShape(12.dp),
        colors = androidx.compose.material3.ButtonDefaults.buttonColors(
            containerColor = if (peligro) rojoRevocar else verdeAccion,
        ),
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = AREA_TACTIL_MINIMA),
    ) {
        Text(texto, fontWeight = FontWeight.Bold)
    }
}

/**
 * Modal "No fue posible otorgar autorización" (AC6): el cuerpo depende del código; si el fallo
 * es reintentable, ofrece reintentar (con la misma clave de idempotencia). Al revocar (HU-M09) se
 * usa con su propio título y mensaje; reintentar es seguro porque el servidor es idempotente.
 */
@Composable
internal fun DialogoErrorOtorgar(
    fallo: FalloConsentimiento,
    onReintentar: () -> Unit,
    onCerrar: () -> Unit,
    titulo: String = stringResource(R.string.privacidad_error_titulo),
    mensaje: String = mensajeFallo(fallo),
) {
    AlertDialog(
        onDismissRequest = onCerrar,
        modifier = Modifier.testTag(EtiquetasPrueba.DIALOGO_ERROR),
        title = { Text(titulo) },
        text = { Text(mensaje) },
        confirmButton = {
            if (fallo.reintentable) {
                TextButton(onClick = onReintentar, modifier = Modifier.heightIn(min = AREA_TACTIL_MINIMA)) {
                    Text(stringResource(R.string.privacidad_reintentar))
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onCerrar, modifier = Modifier.heightIn(min = AREA_TACTIL_MINIMA)) {
                Text(stringResource(R.string.privacidad_error_cerrar))
            }
        },
    )
}

/** AC3: con campos informados por el servidor, el mensaje dice cuáles completar. */
@Composable
internal fun mensajeFallo(fallo: FalloConsentimiento): String {
    if (fallo is FalloConsentimiento.SolicitudInvalida) {
        val campos = fallo.campos.mapNotNull(::campoRes).distinct().map { stringResource(it) }
        if (campos.isNotEmpty()) return stringResource(R.string.privacidad_error_solicitud, campos.joinToString(", "))
    }
    return stringResource(fallo.mensajeRes())
}

/**
 * Confirmación explícita antes de revocar (AC1). Cancelar no llama a nada; confirmar pasa a la
 * biometría (ADR 0007) y después al servidor.
 */
@Composable
internal fun DialogoConfirmarRevocacion(onConfirmar: () -> Unit, onCancelar: () -> Unit) {
    AlertDialog(
        onDismissRequest = onCancelar,
        modifier = Modifier.testTag(EtiquetasPrueba.DIALOGO_CONFIRMAR_REVOCAR),
        title = {
            Text(
                stringResource(R.string.privacidad_revocar_confirmar_titulo),
                modifier = Modifier.semantics { heading() },
            )
        },
        text = { Text(stringResource(R.string.privacidad_revocar_confirmar_cuerpo)) },
        confirmButton = {
            TextButton(onClick = onConfirmar, modifier = Modifier.heightIn(min = AREA_TACTIL_MINIMA)) {
                Text(stringResource(R.string.privacidad_revocar_confirmar_si), color = rojoRevocar, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onCancelar, modifier = Modifier.heightIn(min = AREA_TACTIL_MINIMA)) {
                Text(stringResource(R.string.privacidad_revocar_confirmar_no))
            }
        },
    )
}

/**
 * HISTORIAL (HU-M09 AC4): cuándo se otorgó y, si aplica, cuándo se revocó o venció, en la zona del
 * dispositivo. Es de solo lectura: no hay acción que lo modifique.
 */
@Composable
internal fun SeccionHistorial(historial: Carga<Historial>, onReintentar: () -> Unit) {
    val idioma = LocalConfiguration.current.locales[0]
    Column(modifier = Modifier.testTag(EtiquetasPrueba.HISTORIAL)) {
        SeccionPrivacidad(stringResource(R.string.privacidad_seccion_historial)) {
            when (historial) {
                Carga.Inactiva, Carga.Cargando -> CargandoPrivacidad()
                is Carga.Error -> {
                    Text(
                        stringResource(R.string.privacidad_historial_error),
                        color = SolventaTema.colores.advertencia,
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                    )
                    OutlinedButton(onClick = onReintentar, modifier = Modifier.heightIn(min = AREA_TACTIL_MINIMA)) {
                        Text(stringResource(R.string.privacidad_reintentar))
                    }
                }
                is Carga.Lista -> if (historial.valor.hitos.isEmpty()) {
                    Text(stringResource(R.string.privacidad_historial_vacio))
                } else {
                    historial.valor.hitos.forEach { hito ->
                        Text(stringResource(hito.tipo.textoRes(), formatearFechaHora(hito.ocurridoEn, idioma)))
                    }
                }
            }
        }
    }
}

/**
 * Autorizaciones anteriores (revocadas o vencidas) cuando no hay una vigente: cada fila abre su
 * comprobante con el historial (AC4). La etiqueta de estado tiene texto, no solo color.
 */
@Composable
internal fun SeccionAnteriores(anteriores: List<Consentimiento>, onVerHistorial: (String) -> Unit) {
    val idioma = LocalConfiguration.current.locales[0]
    val accion = stringResource(R.string.privacidad_accion_ver_historial)
    SeccionPrivacidad(stringResource(R.string.privacidad_seccion_anteriores)) {
        anteriores.forEach { consentimiento ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = AREA_TACTIL_MINIMA)
                    .clickable(onClickLabel = accion, role = Role.Button) { onVerHistorial(consentimiento.id) }
                    .testTag(EtiquetasPrueba.anterior(consentimiento.id)),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    stringResource(R.string.privacidad_otorgado_en, formatearFecha(consentimiento.otorgadoEn, idioma)),
                    modifier = Modifier.weight(1f),
                )
                EtiquetaEstadoPermiso(consentimiento.estado.etiqueta())
            }
        }
    }
}