package com.solventa.feature.billetera.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.billetera.DetallePolizaUiState
import com.solventa.feature.billetera.EtiquetasPrueba
import com.solventa.feature.billetera.R
import com.solventa.feature.billetera.dominio.PolizaDetalle

/**
 * Carné digital (AC2): vigencia, coberturas y credencial. Una póliza ajena (AC3) y una inexistente
 * muestran solo un mensaje genérico: ningún dato de la póliza.
 */
@Composable
fun DetallePolizaScreen(
    estado: DetallePolizaUiState,
    onReintentar: () -> Unit,
    onVolver: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().background(fondoBilletera)) {
        BarraBilletera(stringResource(R.string.detalle_titulo), onVolver = onVolver)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when (estado) {
                DetallePolizaUiState.Cargando -> CargandoBilletera()
                DetallePolizaUiState.SinConexion ->
                    MensajeBilletera(stringResource(R.string.detalle_error_sin_conexion), EtiquetasPrueba.ERROR, onReintentar)
                DetallePolizaUiState.Error ->
                    MensajeBilletera(stringResource(R.string.detalle_error_generico), EtiquetasPrueba.ERROR, onReintentar)
                DetallePolizaUiState.NoAutorizada ->
                    MensajeBilletera(stringResource(R.string.detalle_no_autorizada), EtiquetasPrueba.NO_AUTORIZADA)
                DetallePolizaUiState.NoEncontrada ->
                    MensajeBilletera(stringResource(R.string.detalle_no_encontrada), EtiquetasPrueba.NO_ENCONTRADA)
                is DetallePolizaUiState.Contenido -> ContenidoDetalle(estado.poliza)
            }
        }
    }
}

@Composable
private fun ContenidoDetalle(poliza: PolizaDetalle) {
    val idioma = LocalConfiguration.current.locales[0]

    SeccionBilletera(stringResource(R.string.detalle_seccion_seguro), Modifier.testTag(EtiquetasPrueba.DETALLE)) {
        Text(
            stringResource(R.string.detalle_producto_ramo, poliza.producto, poliza.ramo),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = SolventaTema.colores.textoPrimario,
        )
        Text(
            stringResource(R.string.detalle_numero_poliza, poliza.numero),
            style = MaterialTheme.typography.bodyMedium,
            color = SolventaTema.colores.textoPrimario,
        )
        ChipEstadoPoliza(poliza.vigente)
    }

    SeccionBilletera(stringResource(R.string.detalle_seccion_credencial), Modifier.testTag(EtiquetasPrueba.CREDENCIAL)) {
        Text(
            stringResource(R.string.detalle_credencial_numero, poliza.credencial.numero),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = SolventaTema.colores.textoPrimario,
        )
        Text(
            stringResource(R.string.detalle_credencial_huella, abreviarHuella(poliza.credencial.huella)),
            style = MaterialTheme.typography.bodyMedium,
            color = SolventaTema.colores.textoSecundario,
        )
        Text(
            stringResource(R.string.detalle_credencial_firma, poliza.credencial.firmaId),
            style = MaterialTheme.typography.bodyMedium,
            color = SolventaTema.colores.textoSecundario,
        )
    }

    SeccionBilletera(stringResource(R.string.detalle_seccion_coberturas), Modifier.testTag(EtiquetasPrueba.COBERTURAS)) {
        poliza.coberturas.forEach { cobertura ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("•", style = MaterialTheme.typography.bodyMedium, color = SolventaTema.colores.textoSecundario)
                Text(
                    cobertura.nombre,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolventaTema.colores.textoPrimario,
                    modifier = Modifier.weight(1f),
                )
                if (cobertura.obligatoria) {
                    Text(
                        stringResource(R.string.detalle_cobertura_obligatoria),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = SolventaTema.colores.acento,
                    )
                }
            }
        }
    }

    SeccionBilletera(stringResource(R.string.detalle_seccion_valores)) {
        Text(
            stringResource(R.string.detalle_suma_asegurada),
            style = MaterialTheme.typography.labelLarge,
            color = SolventaTema.colores.textoSecundario,
        )
        Text(
            montoTexto(poliza.sumaAsegurada, poliza.moneda),
            style = MaterialTheme.typography.titleMedium,
            color = SolventaTema.colores.textoPrimario,
        )
        Text(
            stringResource(R.string.detalle_prima),
            style = MaterialTheme.typography.labelLarge,
            color = SolventaTema.colores.textoSecundario,
        )
        Text(
            stringResource(R.string.detalle_prima_periodicidad, montoTexto(poliza.prima, poliza.moneda), poliza.periodicidad),
            style = MaterialTheme.typography.titleMedium,
            color = SolventaTema.colores.textoPrimario,
        )
    }

    SeccionBilletera(stringResource(R.string.detalle_seccion_vigencia)) {
        HitoVigencia(
            stringResource(R.string.detalle_vigencia_inicio, formatearFecha(poliza.vigencia.desde, idioma)),
            Icons.Filled.Check,
            azulHito,
        )
        Box(
            Modifier
                .padding(start = 13.dp)
                .size(width = 2.dp, height = 16.dp)
                .background(SolventaTema.colores.campoBorde),
        )
        HitoVigencia(
            stringResource(R.string.detalle_vigencia_fin, formatearFecha(poliza.vigencia.hasta, idioma)),
            Icons.Filled.Close,
            naranjaHito,
        )
    }
}

private val azulHito = Color(0xFF3A57E8)
private val naranjaHito = Color(0xFFF2994A)

/** Punto de la línea de tiempo de la vigencia: círculo con borde de color y su fecha. */
@Composable
private fun HitoVigencia(texto: String, icono: ImageVector, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(color.copy(alpha = 0.12f), CircleShape)
                .border(2.dp, color, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icono, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
        }
        Text(
            texto,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
            color = SolventaTema.colores.textoPrimario,
        )
    }
}
