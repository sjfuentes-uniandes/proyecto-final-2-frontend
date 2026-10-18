package com.solventa.feature.privacidad.ui

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.privacidad.Carga
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.R
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.Permiso

/**
 * Panel de Privacidad (AC5, mockup_pantalla_movil_permisos.png): los tres permisos con su
 * estado. Solo Open Finance y Open Data abre su detalle; los otros dos se ven deshabilitados con
 * "No disponible en esta versión" y no llaman al servidor (ADR 0001).
 */
@Composable
fun ListaPermisosScreen(
    permisos: List<Permiso>,
    consentimientos: Carga<List<Consentimiento>>,
    onAbrirPermiso: (Permiso) -> Unit,
    onReintentar: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        BarraPrivacidad(stringResource(R.string.privacidad_barra_titulo))
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                stringResource(R.string.privacidad_lista_titulo),
                style = MaterialTheme.typography.headlineSmall,
                color = SolventaTema.colores.textoPrimario,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                stringResource(R.string.privacidad_lista_subtitulo),
                style = MaterialTheme.typography.bodyMedium,
                color = SolventaTema.colores.textoSecundario,
            )
            when (consentimientos) {
                Carga.Inactiva, Carga.Cargando -> CargandoPrivacidad()
                is Carga.Error -> ErrorCargaPrivacidad(onReintentar)
                is Carga.Lista -> Unit
            }
            // El consentimiento más reciente decide el estado de Open Finance (el servidor ordena).
            val masReciente = (consentimientos as? Carga.Lista)?.valor?.firstOrNull()
            permisos.forEach { permiso ->
                val etiqueta = when {
                    !permiso.soportado -> EtiquetaEstado.NO_DISPONIBLE
                    consentimientos is Carga.Lista -> masReciente?.estado.etiqueta()
                    else -> null
                }
                TarjetaPermiso(permiso, etiqueta, onAbrir = { onAbrirPermiso(permiso) })
            }
        }
    }
}

@Composable
private fun TarjetaPermiso(permiso: Permiso, etiqueta: EtiquetaEstado?, onAbrir: () -> Unit) {
    val habilitado = permiso.soportado
    val noDisponible = stringResource(R.string.privacidad_no_disponible)
    val estado = etiqueta?.let { stringResource(R.string.privacidad_estado_descripcion, stringResource(it.textoRes)) }
    val forma = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = AREA_TACTIL_MINIMA)
            .clip(forma)
            .border(1.dp, SolventaTema.colores.campoBorde, forma)
            .clickable(
                enabled = habilitado,
                role = Role.Button,
                onClickLabel = stringResource(R.string.privacidad_accion_abrir_permiso),
                onClick = onAbrir,
            )
            .testTag(EtiquetasPrueba.permiso(permiso.name))
            .semantics(mergeDescendants = true) {
                if (estado != null) stateDescription = estado
                if (!habilitado) disabled()
            }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                stringResource(permiso.nombreRes()),
                style = MaterialTheme.typography.titleMedium,
                color = SolventaTema.colores.textoPrimario,
            )
            Text(
                if (habilitado) stringResource(permiso.descripcionRes()) else noDisponible,
                style = MaterialTheme.typography.bodySmall,
                color = SolventaTema.colores.textoSecundario,
                textDecoration = if (habilitado) TextDecoration.Underline else null,
            )
        }
        // Visual: el estado ya se anuncia una vez con stateDescription en la tarjeta.
        etiqueta?.let { Box(Modifier.clearAndSetSemantics {}) { EtiquetaEstadoPermiso(it) } }
    }
}
