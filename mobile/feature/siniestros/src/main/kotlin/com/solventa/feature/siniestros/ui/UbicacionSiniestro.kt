package com.solventa.feature.siniestros.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.SiniestrosUiState
import com.solventa.feature.siniestros.dominio.EstadoUbicacion
import com.solventa.feature.siniestros.dominio.MotivoSinUbicacion
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.UbicacionReporte
import java.text.NumberFormat

@Composable
internal fun SeccionUbicacion(
    estado: SiniestrosUiState,
    alCapturar: () -> Unit,
    alGuardar: () -> Unit,
    alAjustes: () -> Unit,
    alReintentarLimites: () -> Unit,
) {
    val reglas = estado.limites?.reglasUbicacion
    val ocupada = estado.enviando || estado.importandoEvidencia || estado.guardandoUbicacion || estado.obteniendoUbicacion
    SeccionSiniestro(stringResource(R.string.ubicacion_titulo)) {
        Text(stringResource(if (reglas?.requiere(estado.causa) != false) R.string.ubicacion_obligatoria else R.string.ubicacion_opcional))
        if (reglas == null) {
            AvisoSiniestro(stringResource(R.string.ubicacion_error_limites))
            TextButton(onClick = alReintentarLimites, enabled = !estado.cargando) {
                Text(stringResource(R.string.siniestros_reintentar))
            }
        } else {
            Text(stringResource(R.string.ubicacion_precision_maxima, numeroUbicacion(reglas.precisionMaxM)))
        }
        if (estado.ubicacionPendiente != null) {
            AvisoSiniestro(stringResource(R.string.ubicacion_pendiente))
        } else {
            DatosUbicacion(estado.ubicacion)
        }
        estado.motivoSinUbicacion?.let { motivo ->
            Text(stringResource(when (motivo) {
                MotivoSinUbicacion.DESACTIVADA -> R.string.ubicacion_desactivada
                MotivoSinUbicacion.TIEMPO_AGOTADO -> R.string.ubicacion_tiempo_agotado
                MotivoSinUbicacion.SIN_LECTURA, MotivoSinUbicacion.ERROR -> R.string.ubicacion_sin_lectura
            }))
        }
        estado.falloUbicacion?.let { ErrorSiniestros(it, estado.limites) }
        if (estado.obteniendoUbicacion || estado.guardandoUbicacion) {
            Text(stringResource(if (estado.obteniendoUbicacion) R.string.ubicacion_obteniendo else R.string.ubicacion_guardando))
        }
        val permiso = estado.ubicacionPendiente?.permiso ?: estado.ubicacion?.lectura?.permiso
        if (permiso == PermisoUbicacion.DENEGADO_PERMANENTEMENTE) {
            if (estado.ubicacionPendiente != null) Text(stringResource(R.string.ubicacion_permiso_permanente))
            BotonSecundario(stringResource(R.string.ubicacion_abrir_ajustes), alAjustes, habilitado = !ocupada)
        } else {
            BotonSecundario(
                stringResource(R.string.ubicacion_obtener),
                alCapturar,
                habilitado = !ocupada && reglas != null,
            )
        }
        if (estado.ubicacionPendiente != null) {
            BotonSecundario(stringResource(R.string.ubicacion_reintentar_guardado), alGuardar, habilitado = !ocupada)
        }
    }
}

@Composable
internal fun DatosUbicacion(ubicacion: UbicacionReporte?) {
    Column(
        Modifier.semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (ubicacion == null) {
            Text(stringResource(R.string.ubicacion_sin_registrar))
        } else {
            Text(stringResource(when (ubicacion.estado) {
                EstadoUbicacion.DISPONIBLE -> R.string.ubicacion_disponible
                EstadoUbicacion.NO_CONFIABLE -> R.string.ubicacion_no_confiable
                EstadoUbicacion.NO_DISPONIBLE -> R.string.ubicacion_no_disponible
            }))
            Text(stringResource(when (ubicacion.lectura.permiso) {
                PermisoUbicacion.PRECISO -> R.string.ubicacion_permiso_preciso
                PermisoUbicacion.APROXIMADO -> R.string.ubicacion_permiso_aproximado
                PermisoUbicacion.DENEGADO -> R.string.ubicacion_permiso_denegado
                PermisoUbicacion.DENEGADO_PERMANENTEMENTE -> R.string.ubicacion_permiso_permanente
                PermisoUbicacion.NO_SOLICITADO -> R.string.ubicacion_permiso_no_solicitado
            }))
            ubicacion.lectura.lat?.let { Text(stringResource(R.string.ubicacion_latitud, coordenadaUbicacion(it))) }
            ubicacion.lectura.lon?.let { Text(stringResource(R.string.ubicacion_longitud, coordenadaUbicacion(it))) }
            ubicacion.lectura.precisionM?.let { Text(stringResource(R.string.ubicacion_precision, numeroUbicacion(it))) }
            ubicacion.lectura.capturadaEn?.let { Text(stringResource(R.string.ubicacion_capturada, fechaLegible(it))) }
        }
    }
}

@Composable
private fun numeroUbicacion(valor: Double): String = NumberFormat.getNumberInstance(LocalConfiguration.current.locales[0]).apply {
    maximumFractionDigits = 2
}.format(valor)

@Composable
private fun coordenadaUbicacion(valor: Double): String = NumberFormat.getNumberInstance(LocalConfiguration.current.locales[0]).apply {
    maximumFractionDigits = 7
    isGroupingUsed = false
}.format(valor)
