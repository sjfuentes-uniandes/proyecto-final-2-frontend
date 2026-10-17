package com.solventa.feature.privacidad.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.R
import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.TextoVigente

/** Aviso informativo sobre el resultado (no es un error). */
enum class AvisoPermiso(val textoRes: Int) {
    OTORGADA(R.string.privacidad_otorgada),
    YA_OTORGADA(R.string.privacidad_ya_otorgada),
    BIOMETRIA_CANCELADA(R.string.privacidad_biometria_cancelada),
}

/** Lo que muestra la pantalla del permiso: la arma [PermisoOpenFinanceRoute] desde el ViewModel. */
sealed interface VistaPermiso {
    data object Cargando : VistaPermiso

    data class ErrorCarga(val onReintentar: () -> Unit) : VistaPermiso

    /** Texto vigente visible antes de confirmar (AC1). */
    data class Formulario(val texto: TextoVigente, val enCurso: Boolean) : VistaPermiso

    /** Comprobante consultable (AC1). */
    data class Comprobante(val consentimiento: Consentimiento) : VistaPermiso
}

/**
 * Detalle y otorgamiento de Open Finance y Open Data (AC6, mockup_1_HUM08.png): secciones
 * PROPÓSITO, DATOS SOLICITADOS y VIGENCIA. El botón de revocar llega con HU-M09.
 */
@Composable
fun PermisoOpenFinanceScreen(
    vista: VistaPermiso,
    aviso: AvisoPermiso?,
    falloOtorgar: FalloConsentimiento?,
    onVolver: () -> Unit,
    onOtorgar: (SolicitudOtorgamiento) -> Unit,
    onReintentarOtorgar: () -> Unit,
    onCerrarError: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        BarraPrivacidad(stringResource(R.string.privacidad_detalle_titulo), onVolver = onVolver)
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            aviso?.let { AvisoPrivacidad(stringResource(it.textoRes)) }
            when (vista) {
                VistaPermiso.Cargando -> CargandoPrivacidad()
                is VistaPermiso.ErrorCarga -> ErrorCargaPrivacidad(vista.onReintentar)
                is VistaPermiso.Formulario -> FormularioOtorgar(vista.texto, vista.enCurso, onOtorgar)
                is VistaPermiso.Comprobante -> ComprobanteConsentimiento(vista.consentimiento)
            }
        }
    }
    falloOtorgar?.let { DialogoErrorOtorgar(it, onReintentarOtorgar, onCerrarError) }
}

@Composable
private fun SeccionProposito() {
    SeccionPrivacidad(stringResource(R.string.privacidad_seccion_proposito)) {
        Text(stringResource(R.string.privacidad_proposito_perfilamiento), style = MaterialTheme.typography.bodyLarge)
        Text(
            stringResource(R.string.privacidad_proposito_perfilamiento_descripcion),
            style = MaterialTheme.typography.bodyMedium,
            color = SolventaTema.colores.textoSecundario,
        )
    }
}

@Composable
private fun FormularioOtorgar(texto: TextoVigente, enCurso: Boolean, onOtorgar: (SolicitudOtorgamiento) -> Unit) {
    // Lo elegido sobrevive a rotaciones; los alcances se guardan por nombre.
    var alcances by rememberSaveable { mutableStateOf(listOf<String>()) }
    var vigencia by rememberSaveable(texto.vigenciaDefectoMeses) { mutableIntStateOf(texto.vigenciaDefectoMeses) }

    SeccionProposito()
    SeccionPrivacidad(stringResource(R.string.privacidad_seccion_texto)) {
        Text(texto.titulo, style = MaterialTheme.typography.titleSmall)
        Text(texto.cuerpo, style = MaterialTheme.typography.bodyMedium)
        Text(texto.aviso, style = MaterialTheme.typography.bodySmall, color = SolventaTema.colores.textoSecundario)
        Text(
            stringResource(R.string.privacidad_version_texto, texto.versionTexto),
            style = MaterialTheme.typography.bodySmall,
            color = SolventaTema.colores.textoSecundario,
        )
    }
    SeccionPrivacidad(stringResource(R.string.privacidad_seccion_datos)) {
        Text(stringResource(R.string.privacidad_datos_instruccion), style = MaterialTheme.typography.bodySmall)
        Alcance.entries.forEach { alcance ->
            val marcado = alcance.name in alcances
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = AREA_TACTIL_MINIMA)
                    .toggleable(
                        value = marcado,
                        enabled = !enCurso,
                        role = Role.Checkbox,
                        onValueChange = { alcances = if (it) alcances + alcance.name else alcances - alcance.name },
                    )
                    .testTag(EtiquetasPrueba.alcance(alcance.name)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // La fila entera es el control: la casilla no recibe toques propios.
                Checkbox(checked = marcado, onCheckedChange = null, enabled = !enCurso)
                Text(stringResource(alcance.nombreRes()), modifier = Modifier.padding(start = 12.dp))
            }
        }
    }
    SeccionPrivacidad(stringResource(R.string.privacidad_seccion_vigencia)) {
        Column(modifier = Modifier.selectableGroup()) {
            texto.vigenciasMeses.forEach { meses ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = AREA_TACTIL_MINIMA)
                        .selectable(
                            selected = vigencia == meses,
                            enabled = !enCurso,
                            role = Role.RadioButton,
                            onClick = { vigencia = meses },
                        )
                        .testTag(EtiquetasPrueba.vigencia(meses)),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = vigencia == meses, onClick = null, enabled = !enCurso)
                    Text(pluralStringResource(R.plurals.privacidad_vigencia_opcion, meses, meses), modifier = Modifier.padding(start = 12.dp))
                }
            }
        }
    }
    BotonPrincipal(
        texto = stringResource(if (enCurso) R.string.privacidad_boton_otorgando else R.string.privacidad_boton_otorgar),
        habilitado = !enCurso && alcances.isNotEmpty(),
        onClick = {
            onOtorgar(
                SolicitudOtorgamiento(
                    permiso = Permiso.OPEN_FINANCE_OPEN_DATA,
                    alcances = Alcance.entries.filter { it.name in alcances }.toSet(),
                    vigenciaMeses = vigencia,
                    versionTexto = texto.versionTexto,
                    idioma = texto.idioma,
                ),
            )
        },
        modifier = Modifier.testTag(EtiquetasPrueba.BOTON_OTORGAR),
    )
}

@Composable
private fun ComprobanteConsentimiento(consentimiento: Consentimiento) {
    val idioma = LocalConfiguration.current.locales[0]
    Column(
        modifier = Modifier.testTag(EtiquetasPrueba.COMPROBANTE),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SeccionProposito()
        SeccionPrivacidad(stringResource(R.string.privacidad_seccion_datos)) {
            consentimiento.alcances.forEach { codigo ->
                // Un alcance que esta versión no conoce se muestra con su código (N-1).
                Text(alcanceRes(codigo)?.let { stringResource(it) } ?: codigo)
            }
        }
        SeccionPrivacidad(stringResource(R.string.privacidad_seccion_vigencia)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    stringResource(R.string.privacidad_vencimiento, formatearFecha(consentimiento.vigenteHasta, idioma)),
                    modifier = Modifier.weight(1f),
                )
                EtiquetaEstadoPermiso(consentimiento.estado.etiqueta())
            }
            Text(stringResource(R.string.privacidad_otorgado_en, formatearFecha(consentimiento.otorgadoEn, idioma)))
            consentimiento.revocadoEn?.let {
                Text(stringResource(R.string.privacidad_revocado_en, formatearFecha(it, idioma)))
            }
            Text(
                stringResource(R.string.privacidad_version_texto, consentimiento.versionTexto),
                style = MaterialTheme.typography.bodySmall,
                color = SolventaTema.colores.textoSecundario,
            )
        }
    }
}
