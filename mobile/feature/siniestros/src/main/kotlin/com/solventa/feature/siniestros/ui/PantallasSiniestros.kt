package com.solventa.feature.siniestros.ui

import android.app.DatePickerDialog
import android.app.TimePickerDialog
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NoPhotography
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.siniestros.EtiquetasSiniestros
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.SiniestrosUiState
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.SiniestroDetalle
import com.solventa.feature.siniestros.dominio.SiniestroResumen
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import com.solventa.feature.siniestros.dominio.ResumenPendienteLocal
import com.solventa.feature.siniestros.puedeEnviarPorUbicacion
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

@Composable
internal fun SiniestrosListaScreen(
    estado: SiniestrosUiState,
    alReintentar: () -> Unit,
    alReportar: () -> Unit,
    alAbrir: (String) -> Unit,
    alAbrirLocal: (String) -> Unit,
    alAbrirReporte: (String) -> Unit,
    alCargarMas: () -> Unit,
) {
    var pendientes by rememberSaveable { mutableStateOf(false) }
    val colores = SolventaTema.colores
    val cargandoAlguna = estado.cargando || estado.cargandoHistorial
    Column(Modifier.fillMaxSize().background(colores.fondoPantalla)) {
        BarraSiniestros(stringResource(R.string.siniestros_titulo)) {
            IconButton(onClick = alReintentar, enabled = !cargandoAlguna, modifier = Modifier.size(AREA_TACTIL)) {
                Icon(
                    Icons.Filled.Refresh,
                    contentDescription = stringResource(R.string.siniestros_actualizar),
                    tint = Color.White,
                )
            }
        }
        Column(
            Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            EncabezadoSiniestros(
                stringResource(R.string.siniestros_lista_titulo),
                stringResource(R.string.siniestros_lista_subtitulo),
            )
            PestanasSiniestros(
                opciones = listOf(
                    stringResource(R.string.siniestros_historial),
                    stringResource(R.string.siniestros_pendientes),
                ),
                seleccionada = if (pendientes) 1 else 0,
                alSeleccionar = { pendientes = it == 1 },
            )
            val error = if (pendientes) estado.errorCarga else estado.errorHistorial
            val vacio = if (pendientes) estado.borradores.isEmpty() else estado.historial.isEmpty()
            val cargando = if (pendientes) estado.cargando else estado.cargandoHistorial
            if (error != null) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AvisoSiniestro(stringResource(R.string.siniestros_error_carga))
                    ErrorSiniestros(error, estado.limites)
                    BotonSecundario(stringResource(R.string.siniestros_reintentar), alReintentar)
                }
            }
            if (pendientes) estado.errorPendientesLocales?.let { ErrorSiniestros(it, estado.limites) }
            when {
                cargando && vacio -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        CircularProgressIndicator(color = colores.marca)
                        Text(stringResource(R.string.siniestros_cargando), color = colores.textoSecundario)
                    }
                }
                vacio && (!pendientes || estado.pendientesLocales.isEmpty()) -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    if (error == null) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            IconoCirculo(if (pendientes) Icons.Filled.EditNote else Icons.Filled.Assignment, TonoEstado.NEUTRO, 64)
                            Text(
                                stringResource(if (pendientes) R.string.siniestros_pendientes_vacio else R.string.siniestros_lista_vacia),
                                modifier = Modifier.testTag(EtiquetasSiniestros.LISTA_VACIA),
                                color = colores.textoSecundario,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
                else -> LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (pendientes) {
                        items(estado.pendientesLocales, key = { "local_${it.id}" }) { pendiente ->
                            TarjetaPendienteLocal(pendiente, alAbrir = { alAbrirLocal(pendiente.id) })
                        }
                        val idsLocales = estado.pendientesLocales.mapNotNull { it.borradorId }.toSet()
                        items(estado.borradores.filterNot { it.id in idsLocales }, key = BorradorResumen::id) { borrador ->
                            TarjetaBorrador(borrador, alAbrir = { alAbrir(borrador.id) })
                        }
                    } else {
                        items(estado.historial, key = { it.id }) { reporte ->
                            TarjetaReporte(reporte, alAbrir = { alAbrirReporte(reporte.id) })
                        }
                        if (estado.siguienteCursor != null) item {
                            TextButton(
                                onClick = alCargarMas,
                                enabled = !estado.cargandoHistorial,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(stringResource(R.string.siniestros_cargar_mas), color = colores.marca, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
        BotonPrincipal(
            stringResource(R.string.siniestros_reportar),
            alReportar,
            modifier = Modifier.padding(16.dp).testTag(EtiquetasSiniestros.REPORTAR),
        )
    }
}

@Composable
private fun TarjetaPendienteLocal(pendiente: ResumenPendienteLocal, alAbrir: () -> Unit) {
    val colores = SolventaTema.colores
    Column(
        Modifier.fillMaxWidth().tarjetaSiniestro().clickable(role = Role.Button, onClick = alAbrir)
            .testTag("pendiente_local_${pendiente.id}").padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        ChipEstado(stringResource(R.string.siniestros_pendiente_local_estado), TonoEstado.NEUTRO)
        Text(pendiente.descripcion, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Text(
            stringResource(R.string.siniestros_pendiente_local_archivos, pendiente.cantidadEvidencias),
            style = MaterialTheme.typography.bodySmall, color = colores.textoSecundario,
        )
        Text(stringResource(R.string.siniestros_pendiente_local_abrir), color = colores.marca, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun TarjetaReporte(reporte: SiniestroResumen, alAbrir: () -> Unit) {
    val colores = SolventaTema.colores
    Row(
        Modifier
            .fillMaxWidth()
            .tarjetaSiniestro()
            .clickable(role = Role.Button, onClick = alAbrir)
            .testTag("reporte_${reporte.id}")
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        IconoCirculo(Icons.Filled.Assignment, tonoEstadoReporte(reporte.estado))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                stringResource(R.string.siniestros_radicado).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = colores.marca,
            )
            Text(
                reporte.codigo,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = colores.textoPrimario,
            )
            Text(
                fechaLegible(reporte.reportadoEn),
                style = MaterialTheme.typography.bodySmall,
                color = colores.textoSecundario,
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            ChipEstado(estadoReporte(reporte.estado), tonoEstadoReporte(reporte.estado))
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = colores.textoSecundario)
    }
}

@Composable
private fun TarjetaBorrador(borrador: BorradorResumen, alAbrir: () -> Unit) {
    val colores = SolventaTema.colores
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .tarjetaSiniestro()
            .clickable(role = Role.Button, onClick = alAbrir)
            .testTag(EtiquetasSiniestros.borrador(borrador.id))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        IconoCirculo(Icons.Filled.EditNote, TonoEstado.NEUTRO)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ChipEstado(stringResource(R.string.siniestros_estado_abierto), TonoEstado.NEUTRO)
            Text(
                borrador.descripcion,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = colores.textoPrimario,
                maxLines = 2,
            )
            Text(
                stringResource(
                    R.string.siniestros_evidencias_resumen,
                    borrador.cantidadEvidencias,
                    borrador.evidenciasPendientes,
                ),
                style = MaterialTheme.typography.bodySmall,
                color = colores.textoSecundario,
            )
            Text(
                stringResource(R.string.siniestros_ver_detalle),
                color = colores.marca,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = colores.textoSecundario)
    }
}

@Composable
internal fun SiniestroFormularioScreen(
    estado: SiniestrosUiState,
    alVolver: () -> Unit,
    alSeleccionarPoliza: (String) -> Unit,
    alCambiarDescripcion: (String) -> Unit,
    alAgregarEvidencia: () -> Unit,
    alAdjuntarArchivo: () -> Unit,
    alEliminarEvidencia: (String) -> Unit,
    alReportar: () -> Unit,
    alSeleccionarCausa: (String) -> Unit,
    alCambiarFecha: (String) -> Unit,
    alReintentarCoberturas: () -> Unit,
    alEliminarRegistrada: (String) -> Unit,
    alReintentarPolizas: () -> Unit,
    alUbicacion: () -> Unit,
    alGuardarUbicacion: () -> Unit,
    alAjustesUbicacion: () -> Unit,
    alGuardarBorrador: () -> Unit,
    alVolverAPendientes: () -> Unit,
) {
    val colores = SolventaTema.colores
    Column(Modifier.fillMaxSize().background(colores.fondoPantalla)) {
        BarraSiniestros(
            stringResource(R.string.siniestros_nuevo_titulo),
            onVolver = alVolver,
            volverHabilitado = !estado.enviando && !estado.importandoEvidencia,
        )
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SeccionSiniestro(stringResource(R.string.siniestros_seccion_poliza)) {
                SeleccionPoliza(
                    polizas = estado.polizasElegibles,
                    seleccionada = estado.polizaSeleccionada,
                    habilitada = !estado.cargando && !estado.descripcionBloqueada && !estado.enviando && estado.borradorActualId == null,
                    alSeleccionar = alSeleccionarPoliza,
                )
                if (estado.borradorActualId == null) {
                    when {
                        estado.cargando -> Text(stringResource(R.string.siniestros_validando_polizas))
                        estado.errorValidacionPolizas -> {
                            AvisoSiniestro(stringResource(R.string.siniestros_error_validar_polizas))
                            TextButton(onClick = alReintentarPolizas, enabled = !estado.enviando) {
                                Text(stringResource(R.string.siniestros_reintentar), color = colores.marca, fontWeight = FontWeight.Bold)
                            }
                        }
                        estado.polizasElegibles.isEmpty() -> AvisoSiniestro(stringResource(R.string.siniestros_sin_polizas))
                    }
                }
            }
            SeccionSiniestro(stringResource(R.string.siniestros_seccion_evento)) {
                SeleccionCausa(estado.coberturas, estado.causa, !estado.enviando && !estado.cargandoCoberturas, alSeleccionarCausa)
                if (estado.cargandoCoberturas) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CircularProgressIndicator(Modifier.size(16.dp), color = colores.marca, strokeWidth = 2.dp)
                        Text(
                            stringResource(R.string.siniestros_cargando_coberturas),
                            style = MaterialTheme.typography.bodySmall,
                            color = colores.textoSecundario,
                        )
                    }
                }
                estado.errorCoberturas?.let {
                    ErrorSiniestros(it, estado.limites)
                    TextButton(onClick = alReintentarCoberturas, enabled = !estado.enviando) {
                        Text(stringResource(R.string.siniestros_reintentar), color = colores.marca, fontWeight = FontWeight.Bold)
                    }
                }
                FechaEvento(estado.fechaEvento, !estado.enviando, alCambiarFecha)
                CampoTextoSiniestro(
                    etiqueta = stringResource(R.string.siniestros_descripcion_obligatoria),
                    valor = estado.descripcion,
                    alCambiar = alCambiarDescripcion,
                    habilitado = !estado.descripcionBloqueada && !estado.enviando,
                    placeholder = stringResource(R.string.siniestros_descripcion_hint),
                    ayuda = stringResource(R.string.siniestros_descripcion_caracteres, estado.descripcion.length),
                    modifier = Modifier.testTag(EtiquetasSiniestros.DESCRIPCION),
                    lineasMinimas = 3,
                )
            }
            SeccionSiniestro(stringResource(R.string.siniestros_anexar)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    BotonSecundario(
                        stringResource(R.string.siniestros_tomar_foto),
                        alAgregarEvidencia,
                        modifier = Modifier.weight(1f),
                        habilitado = puedeCapturar(estado),
                        icono = Icons.Filled.CameraAlt,
                    )
                    BotonSecundario(
                        stringResource(R.string.siniestros_grabar_video),
                        alAgregarEvidencia,
                        modifier = Modifier.weight(1f),
                        habilitado = puedeCapturar(estado),
                        icono = Icons.Filled.Videocam,
                    )
                }
                BotonSecundario(
                    stringResource(R.string.siniestros_adjuntar_archivo),
                    alAdjuntarArchivo,
                    habilitado = !estado.enviando && !estado.importandoEvidencia && estado.limites != null,
                )
                estado.limites?.let { limites ->
                    val formatos = (limites.formatosFoto + limites.formatosVideo)
                        .filter { it in listOf("image/jpeg", "image/png", "video/mp4") }
                        .joinToString(", ")
                    Text(
                        stringResource(R.string.siniestros_formatos_admitidos, formatos),
                        style = MaterialTheme.typography.bodySmall,
                        color = colores.textoSecundario,
                    )
                }
                if (estado.importandoEvidencia) {
                    Text(stringResource(R.string.siniestros_importando_archivo), color = colores.textoSecundario)
                }
                estado.falloFormulario?.takeIf { it.esFalloArchivo() }?.let { ErrorSiniestros(it, estado.limites) }
                if (estado.evidencias.isNotEmpty()) {
                    Text(
                        stringResource(R.string.siniestros_capturas_titulo),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = colores.textoPrimario,
                    )
                    estado.evidencias.forEach { evidencia ->
                        EvidenciaTemporalRow(evidencia, habilitada = !estado.enviando && !estado.importandoEvidencia, alEliminar = { alEliminarEvidencia(evidencia.id) })
                    }
                }
                estado.detalle?.takeIf { it.id == estado.borradorActualId }?.evidencias?.forEach { evidencia ->
                    FilaEvidencia(
                        nombre = evidencia.nombreArchivo,
                        tipo = evidencia.tipo,
                        cargada = evidencia.estadoCarga == EstadoCarga.CARGADA,
                    ) {
                        TextButton(onClick = { alEliminarRegistrada(evidencia.id) }, enabled = !estado.enviando && !estado.importandoEvidencia) {
                            Text(stringResource(R.string.siniestros_quitar_evidencia), color = colores.advertencia)
                        }
                    }
                }
            }
            SeccionUbicacion(estado, alUbicacion, alGuardarUbicacion, alAjustesUbicacion, alReintentarPolizas)
            if (estado.borradorGuardado) AvisoSiniestro(stringResource(R.string.ubicacion_borrador_guardado), exito = true)
            if (estado.pendienteGuardadoLocal && !estado.enviando) {
                AvisoSiniestro(stringResource(R.string.siniestros_pendiente_local_guardado), exito = true)
                BotonSecundario(stringResource(R.string.siniestros_pendiente_local_volver), alVolverAPendientes)
            }
            BotonSecundario(
                stringResource(R.string.ubicacion_guardar_borrador), alGuardarBorrador,
                habilitado = !estado.enviando && !estado.importandoEvidencia && !estado.guardandoUbicacion && !estado.obteniendoUbicacion,
            )
            estado.falloFormulario?.takeUnless { it.esFalloArchivo() }?.let { ErrorSiniestros(it, estado.limites) }
            if (!estado.enviando && !estado.guardandoUbicacion && !estado.obteniendoUbicacion && estado.falloFormulario == null) {
                val pendientes = listOfNotNull(
                    if (estado.polizaSeleccionada == null) stringResource(R.string.siniestros_pendiente_poliza) else null,
                    if (estado.descripcion.isBlank()) stringResource(R.string.siniestros_error_descripcion) else null,
                    if (estado.causa == null) stringResource(R.string.siniestros_error_causa) else null,
                    if (estado.fechaEvento.isBlank()) stringResource(R.string.siniestros_error_fecha) else null,
                    if (estado.evidencias.isEmpty() && (estado.detalle?.cantidadEvidencias ?: 0) == 0)
                        stringResource(R.string.siniestros_error_evidencia_obligatoria) else null,
                    if (estado.limites?.reglasUbicacion == null) stringResource(R.string.ubicacion_error_limites)
                    else if (!estado.puedeEnviarPorUbicacion()) stringResource(R.string.ubicacion_error_validacion)
                    else null,
                )
                pendientes.forEach { AvisoSiniestro(it) }
            }
            BotonPrincipal(
                stringResource(
                    if (estado.borradorActualId == null) R.string.siniestros_reportar_ahora
                    else R.string.siniestros_reintentar_envio,
                ),
                alReportar,
                modifier = Modifier.testTag(EtiquetasSiniestros.ENVIAR),
                habilitado = !estado.enviando && !estado.importandoEvidencia && estado.polizaSeleccionada != null && estado.limites != null &&
                    estado.descripcion.isNotBlank() && estado.causa != null && estado.fechaEvento.isNotBlank() &&
                    (estado.evidencias.isNotEmpty() || (estado.detalle?.cantidadEvidencias ?: 0) > 0) &&
                    estado.puedeEnviarPorUbicacion(),
            )
            if (estado.enviando) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(Modifier.size(20.dp), color = colores.marca, strokeWidth = 2.dp)
                }
            }
            BotonSecundario(
                stringResource(R.string.siniestros_descartar),
                alVolver,
                habilitado = !estado.enviando && !estado.importandoEvidencia,
                peligro = true,
            )
        }
    }
}

private fun puedeCapturar(estado: SiniestrosUiState): Boolean =
    !estado.enviando && !estado.importandoEvidencia && estado.limites != null &&
        estado.evidencias.size + (estado.detalle?.takeIf { it.id == estado.borradorActualId }?.cantidadEvidencias ?: 0) <
        estado.limites.maxEvidencias

private fun FalloSiniestros.esFalloArchivo(): Boolean = when (this) {
    FalloSiniestros.TipoEvidenciaNoAdmitido, FalloSiniestros.EvidenciaNoAdmitida,
    FalloSiniestros.TamanoEvidenciaExcedido, FalloSiniestros.DuracionVideoExcedida,
    FalloSiniestros.DuracionVideoNoDisponible, FalloSiniestros.LimiteEvidenciasAlcanzado,
    FalloSiniestros.ArchivoNoDisponible -> true
    else -> false
}

@Composable
private fun CampoTextoSiniestro(
    etiqueta: String,
    valor: String,
    alCambiar: (String) -> Unit,
    habilitado: Boolean,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    ayuda: String? = null,
    lineasMinimas: Int = 1,
) {
    val colores = SolventaTema.colores
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(etiqueta, style = MaterialTheme.typography.labelLarge, color = colores.textoPrimario)
        OutlinedTextField(
            value = valor,
            onValueChange = alCambiar,
            enabled = habilitado,
            singleLine = lineasMinimas == 1,
            minLines = lineasMinimas,
            maxLines = if (lineasMinimas == 1) 1 else 6,
            placeholder = placeholder?.let { { Text(it, color = colores.textoSecundario) } },
            supportingText = ayuda?.let { { Text(it, color = colores.textoSecundario) } },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = colores.campoFondo,
                unfocusedContainerColor = colores.campoFondo,
                disabledContainerColor = colores.fondoPantalla,
                focusedBorderColor = colores.acento,
                unfocusedBorderColor = colores.campoBorde,
            ),
            modifier = modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun SeleccionCausa(coberturas: List<Cobertura>, causa: String?, habilitada: Boolean, alSeleccionar: (String) -> Unit) {
    var abierto by rememberSaveable { mutableStateOf(false) }
    val seleccionada = coberturas.firstOrNull { it.codigo == causa }
    CampoSelectorSiniestro(
        etiqueta = stringResource(R.string.siniestros_causa_etiqueta),
        valor = seleccionada?.nombre,
        detalle = seleccionada?.codigo,
        placeholder = stringResource(R.string.siniestros_seleccionar_causa),
        habilitado = habilitada && coberturas.isNotEmpty(),
        alAbrir = { abierto = true },
        modifier = Modifier.testTag(EtiquetasSiniestros.CAUSA),
    ) {
        DropdownMenu(expanded = abierto, onDismissRequest = { abierto = false }) {
            coberturas.forEach { cobertura ->
                DropdownMenuItem(
                    text = { Text("${cobertura.nombre} (${cobertura.codigo})") },
                    onClick = { abierto = false; alSeleccionar(cobertura.codigo) },
                )
            }
        }
    }
}

@Composable
private fun FechaEvento(valor: String, habilitada: Boolean, alCambiar: (String) -> Unit) {
    val contexto = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        CampoTextoSiniestro(
            etiqueta = stringResource(R.string.siniestros_fecha_evento),
            valor = valor,
            alCambiar = alCambiar,
            habilitado = habilitada,
            ayuda = stringResource(R.string.siniestros_fecha_formato),
            modifier = Modifier.testTag(EtiquetasSiniestros.FECHA_EVENTO),
        )
        BotonSecundario(
            stringResource(R.string.siniestros_elegir_fecha),
            onClick = {
                val hoy = LocalDate.now()
                DatePickerDialog(contexto, { _, anio, mes, dia ->
                    TimePickerDialog(contexto, { _, hora, minuto ->
                        val fecha = LocalDateTime.of(anio, mes + 1, dia, hora, minuto)
                        val offsets = ZoneId.systemDefault().rules.getValidOffsets(fecha)
                        // Una hora inexistente por cambio horario queda sin offset y la validacion la rechaza.
                        alCambiar(if (offsets.isEmpty()) fecha.toString() else fecha.atOffset(offsets.first()).toString())
                    }, 0, 0, true).show()
                }, hoy.year, hoy.monthValue - 1, hoy.dayOfMonth).show()
            },
            habilitado = habilitada,
            icono = Icons.Filled.CalendarMonth,
        )
    }
}

@Composable
private fun SeleccionPoliza(
    polizas: List<PolizaResumen>,
    seleccionada: String?,
    habilitada: Boolean,
    alSeleccionar: (String) -> Unit,
) {
    var menuAbierto by rememberSaveable { mutableStateOf(false) }
    val poliza = polizas.firstOrNull { it.polizaId == seleccionada }
    CampoSelectorSiniestro(
        etiqueta = stringResource(R.string.siniestros_seguro_asociado),
        valor = poliza?.numero,
        detalle = poliza?.producto,
        placeholder = stringResource(R.string.siniestros_seleccionar_seguro),
        habilitado = habilitada && polizas.isNotEmpty(),
        alAbrir = { menuAbierto = true },
    ) {
        DropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
            polizas.forEach { opcion ->
                DropdownMenuItem(
                    text = { Text("${opcion.numero} · ${opcion.producto}") },
                    onClick = {
                        menuAbierto = false
                        alSeleccionar(opcion.polizaId)
                    },
                )
            }
        }
    }
}

/** Fila de evidencia con icono por tipo, nombre, estado de carga y una acción opcional. */
@Composable
private fun FilaEvidencia(
    nombre: String,
    tipo: TipoEvidencia,
    cargada: Boolean,
    subtitulo: String? = null,
    accion: @Composable () -> Unit = {},
) {
    val colores = SolventaTema.colores
    Row(
        Modifier
            .fillMaxWidth()
            .background(colores.fondoPantalla, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        IconoCirculo(
            if (tipo == TipoEvidencia.VIDEO) Icons.Filled.Videocam else Icons.Filled.CameraAlt,
            if (cargada) TonoEstado.EXITO else TonoEstado.EN_CURSO,
            36,
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                nombre,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = colores.textoPrimario,
                maxLines = 1,
            )
            if (subtitulo != null) {
                Text(subtitulo, style = MaterialTheme.typography.bodySmall, color = colores.textoSecundario)
            }
            ChipEstado(
                stringResource(
                    if (cargada) R.string.siniestros_estado_carga_completada else R.string.siniestros_estado_carga_pendiente,
                ),
                if (cargada) TonoEstado.EXITO else TonoEstado.EN_CURSO,
            )
        }
        accion()
    }
}

@Composable
private fun EvidenciaTemporalRow(evidencia: EvidenciaTemporal, habilitada: Boolean, alEliminar: () -> Unit) {
    val colores = SolventaTema.colores
    val descripcionEliminar = stringResource(R.string.siniestros_captura_eliminar)
    Row(
        Modifier
            .fillMaxWidth()
            .background(colores.fondoPantalla, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        IconoCirculo(
            if (evidencia.tipo == TipoEvidencia.VIDEO) Icons.Filled.Videocam else Icons.Filled.CameraAlt,
            TonoEstado.INFORMATIVO,
            36,
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                stringResource(
                    if (evidencia.tipo == TipoEvidencia.VIDEO) R.string.siniestros_archivo_video
                    else R.string.siniestros_archivo_foto,
                ),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = colores.textoPrimario,
            )
            Text(
                stringResource(
                    R.string.siniestros_tamano_archivo,
                    evidencia.nombreArchivo ?: evidencia.archivo.name,
                    formatBytes(evidencia.archivo.length()),
                ),
                style = MaterialTheme.typography.bodySmall,
                color = colores.textoSecundario,
            )
            ChipEstado(stringResource(R.string.siniestros_captura_pendiente), TonoEstado.EN_CURSO)
        }
        IconButton(
            onClick = alEliminar,
            enabled = habilitada,
            modifier = Modifier.size(AREA_TACTIL).semantics { contentDescription = descripcionEliminar },
        ) {
            Icon(Icons.Filled.DeleteOutline, contentDescription = null, tint = colores.advertencia)
        }
    }
}

/** Pantalla informativa centrada: icono, título, mensaje y acciones. */
@Composable
private fun PantallaInformativa(
    titulo: String,
    mensaje: String,
    icono: androidx.compose.ui.graphics.vector.ImageVector,
    tono: TonoEstado,
    acciones: @Composable () -> Unit,
) {
    val colores = SolventaTema.colores
    Column(Modifier.fillMaxSize().background(colores.fondoPantalla)) {
        BarraSiniestros(stringResource(R.string.siniestros_titulo))
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Column(
                Modifier.fillMaxWidth().tarjetaSiniestro().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                IconoCirculo(icono, tono, 72)
                Text(
                    titulo,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = colores.textoPrimario,
                    textAlign = TextAlign.Center,
                )
                Text(
                    mensaje,
                    style = MaterialTheme.typography.bodyLarge,
                    color = colores.textoSecundario,
                    textAlign = TextAlign.Center,
                )
                acciones()
            }
        }
    }
}

@Composable
internal fun ExplicacionPermisoScreen(alContinuar: () -> Unit, alCancelar: () -> Unit) {
    PantallaInformativa(
        stringResource(R.string.siniestros_permiso_titulo),
        stringResource(R.string.siniestros_permiso_mensaje),
        Icons.Filled.CameraAlt,
        TonoEstado.INFORMATIVO,
    ) {
        BotonPrincipal(stringResource(R.string.siniestros_permiso_continuar), alContinuar)
        TextButton(onClick = alCancelar) {
            Text(stringResource(R.string.siniestros_cancelar), color = SolventaTema.colores.textoSecundario)
        }
    }
}

@Composable
internal fun PermisoDenegadoScreen(alAbrirAjustes: () -> Unit, alVolver: () -> Unit) {
    PantallaInformativa(
        stringResource(R.string.siniestros_permiso_denegado_titulo),
        stringResource(R.string.siniestros_permiso_denegado_mensaje),
        Icons.Filled.NoPhotography,
        TonoEstado.ERROR,
    ) {
        BotonPrincipal(stringResource(R.string.siniestros_abrir_ajustes), alAbrirAjustes)
        TextButton(onClick = alVolver) {
            Text(stringResource(R.string.siniestros_volver), color = SolventaTema.colores.textoSecundario)
        }
    }
}

@Composable
private fun CargandoSiniestro(texto: String) {
    Column(
        Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CircularProgressIndicator(color = SolventaTema.colores.marca)
        Text(texto, color = SolventaTema.colores.textoSecundario)
    }
}

@Composable
private fun SeccionAtencion() {
    SeccionSiniestro(stringResource(R.string.siniestros_seccion_ayuda)) {
        BotonSecundario(
            stringResource(R.string.siniestros_contacto),
            onClick = {},
            habilitado = false,
            icono = Icons.Filled.SupportAgent,
        )
        BotonSecundario(
            stringResource(R.string.siniestros_asistencia),
            onClick = {},
            habilitado = false,
            icono = Icons.Filled.LocationOn,
        )
    }
}

@Composable
internal fun SiniestroDetalleScreen(
    detalle: BorradorDetalle?,
    cargando: Boolean,
    fallo: FalloSiniestros?,
    limites: LimitesSiniestros?,
    alReintentar: () -> Unit,
    alAdjuntarEvidencia: () -> Unit,
    alVolver: () -> Unit,
) {
    val colores = SolventaTema.colores
    Column(Modifier.fillMaxSize().background(colores.fondoPantalla)) {
        BarraSiniestros(stringResource(R.string.siniestros_detalle_titulo), onVolver = alVolver)
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                cargando -> CargandoSiniestro(stringResource(R.string.siniestros_cargando_detalle))
                detalle == null -> {
                    AvisoSiniestro(stringResource(R.string.siniestros_error_detalle))
                    fallo?.let { ErrorSiniestros(it, limites) }
                    BotonPrincipal(stringResource(R.string.siniestros_reintentar), alReintentar)
                }
                else -> {
                    SeccionSiniestro(stringResource(R.string.siniestros_detalle_estado)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            IconoCirculo(Icons.Filled.EditNote, TonoEstado.NEUTRO)
                            ChipEstado(stringResource(R.string.siniestros_estado_abierto), TonoEstado.NEUTRO)
                        }
                        DatoSiniestro(stringResource(R.string.siniestros_descripcion_titulo), detalle.descripcion)
                        DatoSiniestro(stringResource(R.string.siniestros_creado_en), fechaLegible(detalle.creadoEn))
                    }
                    SeccionSiniestro(stringResource(R.string.ubicacion_titulo)) { DatosUbicacion(detalle.ubicacion) }
                    SeccionSiniestro(stringResource(R.string.siniestros_detalle_evidencias)) {
                        Text(
                            stringResource(
                                R.string.siniestros_evidencias_resumen,
                                detalle.cantidadEvidencias,
                                detalle.evidenciasPendientes,
                            ),
                            style = MaterialTheme.typography.bodyMedium,
                            color = colores.textoSecundario,
                        )
                        detalle.evidencias.forEach { evidencia ->
                            FilaEvidencia(
                                nombre = evidencia.nombreArchivo,
                                tipo = evidencia.tipo,
                                cargada = evidencia.estadoCarga == EstadoCarga.CARGADA,
                            )
                        }
                        if (detalle.estado == "ABIERTO") {
                            BotonPrincipal(
                                stringResource(R.string.siniestros_completar_borrador),
                                alAdjuntarEvidencia,
                                habilitado = !cargando,
                                icono = Icons.Filled.EditNote,
                            )
                        }
                    }
                    SeccionAtencion()
                }
            }
        }
    }
}

@Composable
internal fun estadoReporte(estado: String): String = when (estado) {
    "REPORTADO" -> stringResource(R.string.siniestros_reportado)
    "EN_EVALUACION" -> stringResource(R.string.siniestros_en_evaluacion)
    "FALTA_SOPORTE" -> stringResource(R.string.siniestros_falta_soporte)
    "APROBADO" -> stringResource(R.string.siniestros_aprobado)
    "RECHAZADO" -> stringResource(R.string.siniestros_rechazado)
    else -> estado
}

@Composable
internal fun ReporteDetalleScreen(
    detalle: SiniestroDetalle?,
    estado: SiniestrosUiState,
    alReintentar: () -> Unit,
    alVolver: () -> Unit,
    alAccederEvidencia: (String, Boolean) -> Unit,
) {
    val colores = SolventaTema.colores
    Column(Modifier.fillMaxSize().background(colores.fondoPantalla)) {
        BarraSiniestros(stringResource(R.string.siniestros_detalle_titulo), onVolver = alVolver) {
            IconButton(onClick = alReintentar, enabled = !estado.cargandoDetalle, modifier = Modifier.size(AREA_TACTIL)) {
                Icon(
                    Icons.Filled.Refresh,
                    contentDescription = stringResource(R.string.siniestros_actualizar),
                    tint = Color.White,
                )
            }
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            estado.envioConfirmado?.let { envio ->
                if (detalle == null || envio.siniestroId == detalle.resumen.id) {
                    AvisoSiniestro(stringResource(R.string.siniestros_envio_confirmado, envio.codigo), exito = true)
                }
                if (estado.limpiezaPendienteFallida) {
                    AvisoSiniestro(stringResource(R.string.siniestros_pendiente_local_limpieza))
                }
            }
            when {
                estado.cargandoDetalle -> CargandoSiniestro(stringResource(R.string.siniestros_cargando_detalle))
                detalle == null -> {
                    estado.falloFormulario?.let { ErrorSiniestros(it, estado.limites) }
                    AvisoSiniestro(stringResource(R.string.siniestros_error_detalle))
                    BotonPrincipal(stringResource(R.string.siniestros_reintentar), alReintentar)
                }
                else -> {
                    val tono = tonoEstadoReporte(detalle.resumen.estado)
                    Column(
                        Modifier.fillMaxWidth().tarjetaSiniestro().padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            IconoCirculo(Icons.Filled.Assignment, tono, 48)
                            Column(Modifier.weight(1f)) {
                                Text(
                                    stringResource(R.string.siniestros_radicado).uppercase(),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = colores.marca,
                                )
                                Text(
                                    detalle.resumen.codigo,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = colores.textoPrimario,
                                )
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                stringResource(R.string.siniestros_detalle_estado),
                                style = MaterialTheme.typography.labelLarge,
                                color = colores.textoSecundario,
                            )
                            ChipEstado(estadoReporte(detalle.resumen.estado), tono)
                        }
                    }
                    SeccionSiniestro(stringResource(R.string.siniestros_seccion_reporte)) {
                        val numeroPoliza = when {
                            estado.cargandoNumeroPolizaReporte -> stringResource(R.string.siniestros_numero_poliza_cargando)
                            else -> estado.numeroPolizaReporte ?: stringResource(R.string.siniestros_numero_poliza_no_disponible)
                        }
                        DatoSiniestro(stringResource(R.string.siniestros_numero_poliza), numeroPoliza)
                        DatoSiniestro(stringResource(R.string.siniestros_causa_etiqueta), detalle.causa)
                        DatoSiniestro(
                            stringResource(R.string.siniestros_fecha_etiqueta),
                            fechaLegible(detalle.fechaEvento, convertirAZonaLocal = false),
                        )
                        DatoSiniestro(stringResource(R.string.siniestros_reportado_en), fechaLegible(detalle.resumen.reportadoEn))
                        detalle.descripcion?.let { DatoSiniestro(stringResource(R.string.siniestros_descripcion_titulo), it) }
                    }
                    SeccionSiniestro(stringResource(R.string.ubicacion_titulo)) { DatosUbicacion(detalle.ubicacion) }
                    if (detalle.evidencias.isNotEmpty()) {
                        SeccionSiniestro(stringResource(R.string.siniestros_detalle_evidencias)) {
                            estado.falloAccesoEvidencia?.let { fallo ->
                                if (fallo == FalloSiniestros.EvidenciaNoCargada) {
                                    AvisoSiniestro(stringResource(R.string.siniestros_evidencia_sin_confirmar))
                                } else {
                                    ErrorSiniestros(fallo, estado.limites)
                                }
                            }
                            if (estado.evidenciaGuardada) {
                                AvisoSiniestro(stringResource(R.string.siniestros_evidencia_guardada), exito = true)
                            }
                            detalle.evidencias.forEach { evidencia ->
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .background(colores.fondoPantalla, RoundedCornerShape(12.dp))
                                        .padding(horizontal = 12.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = TonoEstado.EXITO.texto)
                                    Text(
                                        evidencia.nombreArchivo,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = colores.textoPrimario,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (estado.descargandoEvidencia == evidencia.id) {
                                    Text(stringResource(R.string.siniestros_descargando_evidencia))
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    TextButton(
                                        onClick = { alAccederEvidencia(evidencia.id, false) },
                                        enabled = estado.descargandoEvidencia == null && estado.archivoPorGuardar == null,
                                        modifier = Modifier.testTag("ver_evidencia_${evidencia.id}"),
                                    ) { Text(stringResource(R.string.siniestros_ver_evidencia)) }
                                    TextButton(
                                        onClick = { alAccederEvidencia(evidencia.id, true) },
                                        enabled = estado.descargandoEvidencia == null && estado.archivoPorGuardar == null,
                                        modifier = Modifier.testTag("descargar_evidencia_${evidencia.id}"),
                                    ) { Text(stringResource(R.string.siniestros_descargar_evidencia)) }
                                }
                            }
                        }
                    }
                    if (detalle.historial.isNotEmpty()) {
                        SeccionSiniestro(stringResource(R.string.siniestros_historial_tramite)) {
                            detalle.historial.forEachIndexed { indice, hito ->
                                HitoTramite(
                                    titulo = hito.estadoNuevo?.let { estadoReporte(it) } ?: hito.accion,
                                    fecha = fechaLegible(hito.ocurridoEn),
                                    tono = hito.estadoNuevo?.let(::tonoEstadoReporte) ?: TonoEstado.NEUTRO,
                                    ultimo = indice == detalle.historial.lastIndex,
                                )
                            }
                        }
                    }
                    SeccionAtencion()
                }
            }
        }
    }
}

/** Punto de la línea de tiempo del trámite. */
@Composable
private fun HitoTramite(titulo: String, fecha: String, tono: TonoEstado, ultimo: Boolean) {
    val colores = SolventaTema.colores
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.padding(top = 4.dp).size(12.dp).background(tono.texto, CircleShape))
            if (!ultimo) {
                Box(Modifier.width(2.dp).heightIn(min = 36.dp).background(colores.campoBorde))
            }
        }
        Column(Modifier.padding(bottom = if (ultimo) 0.dp else 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                titulo,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = colores.textoPrimario,
            )
            Text(fecha, style = MaterialTheme.typography.bodySmall, color = colores.textoSecundario)
        }
    }
}

internal fun formatBytes(bytes: Long): String = when {
    bytes >= BYTES_POR_MIB -> "${bytes / BYTES_POR_MIB} MiB"
    bytes >= BYTES_POR_KIB -> "${bytes / BYTES_POR_KIB} KiB"
    else -> "$bytes B"
}

private const val BYTES_POR_KIB = 1024L
private const val BYTES_POR_MIB = 1024L * 1024L
