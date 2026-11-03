package com.solventa.feature.billetera.ui

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
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
    Column(modifier = Modifier.fillMaxSize().background(fondoBilletera)) {
        BarraBilletera(stringResource(R.string.billetera_titulo), onAbrirPrivacidad = onAbrirPrivacidad)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                stringResource(R.string.billetera_lista_titulo),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = SolventaTema.colores.textoPrimario,
            )
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

/**
 * Acordeón: la cabecera es un solo botón que anuncia el estado y despliega el resumen; el botón
 * "Ver detalle completo" aparece solo desplegado y abre el carné.
 */
@Composable
private fun TarjetaPoliza(poliza: PolizaResumen, onAbrir: () -> Unit) {
    val estado = stringResource(descripcionEstadoRes(poliza.vigente))
    var desplegada by rememberSaveable(poliza.polizaId) { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxWidth().tarjetaBilletera()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = AREA_TACTIL_MINIMA)
                .clickable(
                    role = Role.Button,
                    onClickLabel = stringResource(R.string.billetera_alternar_poliza),
                    onClick = { desplegada = !desplegada },
                )
                .testTag(EtiquetasPrueba.poliza(poliza.polizaId))
                .semantics(mergeDescendants = true) { stateDescription = estado }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    poliza.producto.uppercase(LocalConfiguration.current.locales[0]),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = verdeMarca,
                )
                Text(
                    poliza.numero,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolventaTema.colores.textoPrimario,
                )
            }
            // Visual: el estado ya se anuncia una vez con stateDescription en la cabecera.
            Box(Modifier.clearAndSetSemantics {}) { ChipEstadoPoliza(poliza.vigente, anunciar = false) }
            Icon(
                if (desplegada) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                contentDescription = null,
                tint = SolventaTema.colores.textoSecundario,
            )
        }
        if (desplegada) {
            val cobertura = poliza.resumenCobertura
            Column(
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    stringResource(R.string.billetera_coberturas_principales).uppercase(LocalConfiguration.current.locales[0]),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolventaTema.colores.textoSecundario,
                )
                Text(
                    poliza.ramo,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolventaTema.colores.textoPrimario,
                )
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
                Button(
                    onClick = onAbrir,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = AREA_TACTIL_MINIMA)
                        .testTag(EtiquetasPrueba.verDetalle(poliza.polizaId)),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = verdeMarca, contentColor = Color.White),
                ) {
                    Text(stringResource(R.string.billetera_ver_detalle), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
