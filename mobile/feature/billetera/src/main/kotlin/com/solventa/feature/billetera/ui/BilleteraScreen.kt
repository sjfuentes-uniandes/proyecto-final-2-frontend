package com.solventa.feature.billetera.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.billetera.BilleteraUiState
import com.solventa.feature.billetera.EtiquetasPrueba
import com.solventa.feature.billetera.R
import com.solventa.feature.billetera.dominio.PolizaResumen

/** Mi Billetera (AC1): las pólizas del cliente, con su estado y el resumen de cobertura. */
@Composable
fun BilleteraScreen(
    estado: BilleteraUiState,
    onAbrirPoliza: (String) -> Unit,
    onReintentar: () -> Unit,
    onAbrirPrivacidad: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        BarraBilletera(stringResource(R.string.billetera_titulo), onAbrirPrivacidad = onAbrirPrivacidad)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                stringResource(R.string.billetera_subtitulo),
                style = MaterialTheme.typography.bodyMedium,
                color = SolventaTema.colores.textoSecundario,
            )
            when (estado) {
                BilleteraUiState.Cargando -> CargandoBilletera()
                BilleteraUiState.Vacia ->
                    MensajeBilletera(stringResource(R.string.billetera_vacia), EtiquetasPrueba.VACIA)
                BilleteraUiState.SinConexion ->
                    MensajeBilletera(stringResource(R.string.billetera_error_sin_conexion), EtiquetasPrueba.ERROR, onReintentar)
                BilleteraUiState.Error ->
                    MensajeBilletera(stringResource(R.string.billetera_error_generico), EtiquetasPrueba.ERROR, onReintentar)
                is BilleteraUiState.Contenido -> estado.polizas.forEach { poliza ->
                    TarjetaPoliza(poliza, onAbrir = { onAbrirPoliza(poliza.polizaId) })
                }
            }
        }
    }
}

/** Un solo elemento táctil con rol de botón; el chip se anuncia como el estado de la tarjeta. */
@Composable
private fun TarjetaPoliza(poliza: PolizaResumen, onAbrir: () -> Unit) {
    val estado = stringResource(descripcionEstadoRes(poliza.vigente))
    val forma = RoundedCornerShape(16.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = AREA_TACTIL_MINIMA)
            .clip(forma)
            .border(1.dp, SolventaTema.colores.campoBorde, forma)
            .clickable(
                role = Role.Button,
                onClickLabel = stringResource(R.string.billetera_abrir_poliza),
                onClick = onAbrir,
            )
            .testTag(EtiquetasPrueba.poliza(poliza.polizaId))
            .semantics(mergeDescendants = true) { stateDescription = estado }
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    poliza.producto,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolventaTema.colores.textoPrimario,
                )
                Text(
                    poliza.ramo,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolventaTema.colores.textoSecundario,
                )
            }
            // Visual: el estado ya se anuncia una vez con stateDescription en la tarjeta.
            Box(Modifier.clearAndSetSemantics {}) { ChipEstadoPoliza(poliza.vigente, anunciar = false) }
        }
        Text(
            stringResource(R.string.billetera_poliza_numero, poliza.numero),
            style = MaterialTheme.typography.bodyMedium,
            color = SolventaTema.colores.textoPrimario,
        )
        val cobertura = poliza.resumenCobertura
        Text(
            stringResource(R.string.billetera_suma_asegurada, montoTexto(cobertura.sumaAsegurada, cobertura.moneda)),
            style = MaterialTheme.typography.bodyMedium,
            color = SolventaTema.colores.textoPrimario,
        )
        Text(
            pluralStringResource(R.plurals.billetera_total_coberturas, cobertura.totalCoberturas, cobertura.totalCoberturas),
            style = MaterialTheme.typography.bodySmall,
            color = SolventaTema.colores.textoSecundario,
        )
        // Visual: tocar cualquier parte de la tarjeta ya abre el detalle (onClickLabel).
        Box(Modifier.clearAndSetSemantics {}) {
            Text(
                stringResource(R.string.billetera_ver_detalle),
                style = MaterialTheme.typography.labelLarge,
                color = SolventaTema.colores.acento,
            )
        }
    }
}
