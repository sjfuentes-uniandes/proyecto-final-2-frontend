package com.solventa.feature.siniestros.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.siniestros.EtiquetasSiniestros
import com.solventa.feature.siniestros.EventoSiniestros
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.SiniestrosUiState
import com.solventa.feature.siniestros.SiniestrosViewModel
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.TipoEvidencia

@Composable
fun SiniestrosRoute(
    viewModel: SiniestrosViewModel,
    onIrALogin: () -> Unit,
) {
    val estado by viewModel.uiState.collectAsState()
    var pantalla by rememberSaveable { mutableStateOf(PantallaSiniestros.LISTA) }
    var borradorSeleccionado by rememberSaveable { mutableStateOf<String?>(null) }
    var descartarVisible by rememberSaveable { mutableStateOf(false) }
    var permisoDenegado by rememberSaveable { mutableStateOf(false) }
    val contexto = LocalContext.current

    val permisoCamara = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { concedido ->
        permisoDenegado = !concedido
        if (concedido) pantalla = PantallaSiniestros.CAMARA
        else pantalla = PantallaSiniestros.PERMISO_DENEGADO
    }

    LaunchedEffect(viewModel) {
        viewModel.eventos.collect { evento ->
            when (evento) {
                EventoSiniestros.IrALogin -> onIrALogin()
                is EventoSiniestros.AbrirDetalle -> {
                    borradorSeleccionado = evento.borradorId
                    pantalla = PantallaSiniestros.DETALLE
                    viewModel.consultarDetalle(evento.borradorId)
                }
            }
        }
    }

    BackHandler(enabled = pantalla != PantallaSiniestros.LISTA && pantalla != PantallaSiniestros.CAMARA) {
        when (pantalla) {
            PantallaSiniestros.FORMULARIO -> descartarVisible = true
            PantallaSiniestros.DETALLE -> {
                pantalla = PantallaSiniestros.LISTA
                viewModel.refrescarLista()
            }
            else -> pantalla = PantallaSiniestros.FORMULARIO
        }
    }

    when (pantalla) {
        PantallaSiniestros.LISTA -> SiniestrosListaScreen(
            estado = estado,
            alReintentar = viewModel::reintentarCarga,
            alReportar = {
                viewModel.iniciarNuevoReporte()
                pantalla = PantallaSiniestros.FORMULARIO
            },
            alAbrir = { id ->
                borradorSeleccionado = id
                pantalla = PantallaSiniestros.DETALLE
                viewModel.consultarDetalle(id)
            },
        )
        PantallaSiniestros.FORMULARIO -> SiniestroFormularioScreen(
            estado = estado,
            alVolver = { descartarVisible = true },
            alSeleccionarPoliza = viewModel::seleccionarPoliza,
            alCambiarDescripcion = viewModel::cambiarDescripcion,
            alAgregarEvidencia = {
                permisoDenegado = false
                pantalla = PantallaSiniestros.EXPLICACION_PERMISO
            },
            alEliminarEvidencia = viewModel::eliminarCaptura,
            alReportar = viewModel::reportar,
        )
        PantallaSiniestros.EXPLICACION_PERMISO -> ExplicacionPermisoScreen(
            alContinuar = {
                if (ContextCompat.checkSelfPermission(contexto, Manifest.permission.CAMERA) ==
                    android.content.pm.PackageManager.PERMISSION_GRANTED
                ) {
                    pantalla = PantallaSiniestros.CAMARA
                } else {
                    permisoCamara.launch(Manifest.permission.CAMERA)
                }
            },
            alCancelar = { pantalla = PantallaSiniestros.FORMULARIO },
        )
        PantallaSiniestros.PERMISO_DENEGADO -> PermisoDenegadoScreen(
            alAbrirAjustes = {
                contexto.startActivity(
                    Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.fromParts("package", contexto.packageName, null),
                    ),
                )
            },
            alVolver = { pantalla = PantallaSiniestros.FORMULARIO },
        )
        PantallaSiniestros.CAMARA -> CamaraEvidencias(
            duracionMaximaSegundos = estado.limites?.duracionMaximaVideoSegundos ?: 0,
            crearFoto = viewModel::crearArchivoFoto,
            crearVideo = viewModel::crearArchivoVideo,
            alCapturar = { archivo, tipo, duracion ->
                viewModel.agregarCaptura(archivo, tipo, duracion)
                pantalla = PantallaSiniestros.FORMULARIO
            },
            alEliminar = viewModel::eliminarArchivoTemporal,
            alVolver = { pantalla = PantallaSiniestros.FORMULARIO },
        )
        PantallaSiniestros.DETALLE -> SiniestroDetalleScreen(
            detalle = estado.detalle?.takeIf { it.id == borradorSeleccionado },
            cargando = estado.cargandoDetalle,
            fallo = estado.falloFormulario,
            limites = estado.limites,
            alReintentar = {
                borradorSeleccionado?.let(viewModel::consultarDetalle)
            },
            alVolver = {
                pantalla = PantallaSiniestros.LISTA
                viewModel.refrescarLista()
            },
        )
    }

    if (descartarVisible) {
        AlertDialog(
            onDismissRequest = { descartarVisible = false },
            title = { Text(stringResource(R.string.siniestros_confirmar_descartar_titulo)) },
            text = { Text(stringResource(R.string.siniestros_confirmar_descartar_mensaje)) },
            confirmButton = {
                TextButton(onClick = {
                    descartarVisible = false
                    viewModel.cancelarFormulario()
                    pantalla = PantallaSiniestros.LISTA
                }) { Text(stringResource(R.string.siniestros_confirmar_descartar)) }
            },
            dismissButton = {
                TextButton(onClick = { descartarVisible = false }) {
                    Text(stringResource(R.string.siniestros_cancelar))
                }
            },
        )
    }
}

@Composable
private fun SiniestrosListaScreen(
    estado: SiniestrosUiState,
    alReintentar: () -> Unit,
    alReportar: () -> Unit,
    alAbrir: (String) -> Unit,
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(
            stringResource(R.string.siniestros_lista_titulo),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(
            stringResource(R.string.siniestros_lista_subtitulo),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )
        when {
            estado.cargando -> Text(stringResource(R.string.siniestros_cargando))
            estado.errorCarga != null && estado.borradores.isEmpty() -> Column(
                modifier = Modifier.weight(1f).fillMaxWidth().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(stringResource(R.string.siniestros_error_carga), color = MaterialTheme.colorScheme.error)
                Button(onClick = alReintentar, modifier = Modifier.padding(top = 12.dp)) {
                    Text(stringResource(R.string.siniestros_reintentar))
                }
            }
            estado.borradores.isEmpty() -> Box(
                Modifier.weight(1f).fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    stringResource(R.string.siniestros_lista_vacia),
                    modifier = Modifier.testTag(EtiquetasSiniestros.LISTA_VACIA),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            else -> LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(estado.borradores, key = BorradorResumen::id) { borrador ->
                    TarjetaBorrador(borrador, alAbrir = { alAbrir(borrador.id) })
                }
            }
        }
        Button(
            onClick = alReportar,
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)
                .padding(top = 12.dp).testTag(EtiquetasSiniestros.REPORTAR),
            shape = RoundedCornerShape(24.dp),
        ) {
            Text(stringResource(R.string.siniestros_reportar), fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun TarjetaBorrador(borrador: BorradorResumen, alAbrir: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = alAbrir)
            .testTag(EtiquetasSiniestros.borrador(borrador.id)),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(R.string.siniestros_estado_abierto).uppercase(),
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(borrador.descripcion, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                stringResource(
                    R.string.siniestros_evidencias_resumen,
                    borrador.cantidadEvidencias,
                    borrador.evidenciasPendientes,
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                stringResource(R.string.siniestros_ver_detalle),
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}

@Composable
private fun SiniestroFormularioScreen(
    estado: SiniestrosUiState,
    alVolver: () -> Unit,
    alSeleccionarPoliza: (String) -> Unit,
    alCambiarDescripcion: (String) -> Unit,
    alAgregarEvidencia: () -> Unit,
    alEliminarEvidencia: (String) -> Unit,
    alReportar: () -> Unit,
) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = alVolver, modifier = Modifier.size(48.dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.siniestros_volver))
            }
            Text(
                stringResource(R.string.siniestros_nuevo_titulo),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
        }
        SeleccionPoliza(
            polizas = estado.polizasElegibles,
            seleccionada = estado.polizaSeleccionada,
            habilitada = !estado.descripcionBloqueada,
            alSeleccionar = alSeleccionarPoliza,
        )
        if (estado.polizasElegibles.isEmpty() && !estado.cargando) {
            Text(stringResource(R.string.siniestros_sin_polizas), color = MaterialTheme.colorScheme.error)
        }
        OutlinedTextField(
            value = estado.descripcion,
            onValueChange = alCambiarDescripcion,
            enabled = !estado.descripcionBloqueada,
            label = { Text(stringResource(R.string.siniestros_descripcion_titulo)) },
            placeholder = { Text(stringResource(R.string.siniestros_descripcion_hint)) },
            supportingText = {
                Text(stringResource(R.string.siniestros_descripcion_caracteres, estado.descripcion.length))
            },
            modifier = Modifier.fillMaxWidth().testTag(EtiquetasSiniestros.DESCRIPCION),
            minLines = 3,
            maxLines = 5,
        )
        Card {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.siniestros_anexar), fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = alAgregarEvidencia,
                        enabled = estado.limites != null && estado.evidencias.size < (estado.limites?.maxEvidencias ?: 0),
                        modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                    ) {
                        Icon(Icons.Filled.CameraAlt, contentDescription = null)
                        Text(stringResource(R.string.siniestros_tomar_foto))
                    }
                    OutlinedButton(
                        onClick = alAgregarEvidencia,
                        enabled = estado.limites != null && estado.evidencias.size < (estado.limites?.maxEvidencias ?: 0),
                        modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                    ) {
                        Icon(Icons.Filled.Videocam, contentDescription = null)
                        Text(stringResource(R.string.siniestros_grabar_video))
                    }
                }
                if (estado.evidencias.isNotEmpty()) {
                    Text(stringResource(R.string.siniestros_capturas_titulo), fontWeight = FontWeight.SemiBold)
                    estado.evidencias.forEach { evidencia ->
                        EvidenciaTemporalRow(evidencia, alEliminar = { alEliminarEvidencia(evidencia.id) })
                    }
                }
            }
        }
        OutlinedButton(
            onClick = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
        ) {
            Icon(Icons.Filled.LocationOn, contentDescription = null)
            Text(stringResource(R.string.siniestros_ubicacion))
        }
        estado.falloFormulario?.let { ErrorSiniestros(it, estado.limites) }
        Button(
            onClick = alReportar,
            enabled = !estado.enviando && estado.polizaSeleccionada != null && estado.limites != null,
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
        ) {
            Text(
                stringResource(
                    if (estado.borradorActualId == null) R.string.siniestros_reportar_ahora
                    else R.string.siniestros_reintentar_carga,
                ),
                fontWeight = FontWeight.Bold,
            )
        }
        OutlinedButton(
            onClick = alVolver,
            enabled = !estado.enviando,
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
        ) {
            Text(stringResource(R.string.siniestros_descartar), color = MaterialTheme.colorScheme.error)
        }
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
    Box {
        OutlinedButton(
            onClick = { menuAbierto = true },
            enabled = habilitada && polizas.isNotEmpty(),
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.siniestros_seguro_asociado), style = MaterialTheme.typography.labelMedium)
                Text(poliza?.let { "${it.numero} · ${it.producto}" } ?: stringResource(R.string.siniestros_seleccionar_seguro))
            }
        }
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

@Composable
private fun EvidenciaTemporalRow(evidencia: EvidenciaTemporal, alEliminar: () -> Unit) {
    val descripcionEliminar = stringResource(R.string.siniestros_captura_eliminar)
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            if (evidencia.tipo == TipoEvidencia.VIDEO) Icons.Filled.Videocam else Icons.Filled.CameraAlt,
            contentDescription = null,
        )
        Column(Modifier.weight(1f)) {
            Text(
                stringResource(
                    if (evidencia.tipo == TipoEvidencia.VIDEO) R.string.siniestros_archivo_video
                    else R.string.siniestros_archivo_foto,
                ),
                fontWeight = FontWeight.Medium,
            )
            Text(
                stringResource(
                    R.string.siniestros_tamano_archivo,
                    evidencia.archivo.name,
                    formatBytes(evidencia.archivo.length()),
                ),
                style = MaterialTheme.typography.bodySmall,
            )
        }
        Text(
            stringResource(R.string.siniestros_captura_pendiente),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        TextButton(
            onClick = alEliminar,
            modifier = Modifier.semantics {
                contentDescription = descripcionEliminar
            },
        ) {
            Icon(Icons.Filled.DeleteOutline, contentDescription = null)
        }
    }
}

@Composable
private fun ExplicacionPermisoScreen(alContinuar: () -> Unit, alCancelar: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Filled.CameraAlt, contentDescription = null, modifier = Modifier.size(48.dp))
        Text(
            stringResource(R.string.siniestros_permiso_titulo),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(stringResource(R.string.siniestros_permiso_mensaje), style = MaterialTheme.typography.bodyLarge)
        Button(onClick = alContinuar, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
            Text(stringResource(R.string.siniestros_permiso_continuar))
        }
        TextButton(onClick = alCancelar) { Text(stringResource(R.string.siniestros_cancelar)) }
    }
}

@Composable
internal fun PermisoDenegadoScreen(alAbrirAjustes: () -> Unit, alVolver: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Text(
            stringResource(R.string.siniestros_permiso_denegado_titulo),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(stringResource(R.string.siniestros_permiso_denegado_mensaje))
        Button(onClick = alAbrirAjustes, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
            Text(stringResource(R.string.siniestros_abrir_ajustes))
        }
        TextButton(onClick = alVolver) { Text(stringResource(R.string.siniestros_volver)) }
    }
}

@Composable
private fun SiniestroDetalleScreen(
    detalle: BorradorDetalle?,
    cargando: Boolean,
    fallo: FalloSiniestros?,
    limites: LimitesSiniestros?,
    alReintentar: () -> Unit,
    alVolver: () -> Unit,
) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = alVolver, modifier = Modifier.size(48.dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.siniestros_volver))
            }
            Text(
                stringResource(R.string.siniestros_detalle_titulo),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
        }
        when {
            cargando -> Text(stringResource(R.string.siniestros_cargando_detalle))
            detalle == null -> {
                Text(
                    stringResource(R.string.siniestros_error_detalle),
                    color = MaterialTheme.colorScheme.error,
                )
                fallo?.let { ErrorSiniestros(it, limites) }
                Button(onClick = alReintentar) { Text(stringResource(R.string.siniestros_reintentar)) }
            }
            else -> {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            stringResource(R.string.siniestros_detalle_estado),
                            style = MaterialTheme.typography.labelMedium,
                        )
                        Text(
                            stringResource(R.string.siniestros_estado_abierto),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(detalle.descripcion, style = MaterialTheme.typography.bodyLarge)
                        Text(
                            stringResource(
                                R.string.siniestros_evidencias_resumen,
                                detalle.cantidadEvidencias,
                                detalle.evidenciasPendientes,
                            ),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(stringResource(R.string.siniestros_detalle_evidencias), fontWeight = FontWeight.Bold)
                        detalle.evidencias.forEach { evidencia ->
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(evidencia.nombreArchivo, modifier = Modifier.weight(1f))
                                Text(
                                    stringResource(
                                        if (evidencia.estadoCarga.name == "CARGADA") {
                                            R.string.siniestros_estado_carga_completada
                                        } else {
                                            R.string.siniestros_estado_carga_pendiente
                                        },
                                    ),
                                )
                            }
                        }
                    }
                }
                OutlinedButton(
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                ) {
                    Text(stringResource(R.string.siniestros_contacto))
                }
                Button(
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                ) {
                    Text(stringResource(R.string.siniestros_asistencia))
                }
            }
        }
    }
}

@Composable
internal fun ErrorSiniestros(fallo: FalloSiniestros, limites: LimitesSiniestros?) {
    val mensaje = when (fallo) {
        FalloSiniestros.SinConexion -> stringResource(R.string.siniestros_error_red)
        FalloSiniestros.SesionVencida -> stringResource(R.string.siniestros_error_sesion)
        FalloSiniestros.NoAutorizado, FalloSiniestros.PolizaNoAutorizada ->
            stringResource(R.string.siniestros_error_no_autorizado)
        FalloSiniestros.PolizaNoEncontrada, FalloSiniestros.PolizaNoVigente ->
            stringResource(R.string.siniestros_error_poliza)
        FalloSiniestros.DescripcionObligatoria -> stringResource(R.string.siniestros_error_descripcion)
        FalloSiniestros.DescripcionDemasiadoLarga -> stringResource(R.string.siniestros_error_descripcion_larga)
        FalloSiniestros.TipoEvidenciaNoAdmitido, FalloSiniestros.EvidenciaNoAdmitida ->
            stringResource(R.string.siniestros_error_tipo)
        FalloSiniestros.TamanoEvidenciaExcedido -> stringResource(
            R.string.siniestros_error_tamano,
            formatBytes(limites?.tamanoMaximoFotoBytes ?: 0L),
            formatBytes(limites?.tamanoMaximoVideoBytes ?: 0L),
        )
        FalloSiniestros.DuracionVideoExcedida -> stringResource(
            R.string.siniestros_error_duracion,
            limites?.duracionMaximaVideoSegundos ?: 0,
        )
        FalloSiniestros.LimiteEvidenciasAlcanzado -> stringResource(
            R.string.siniestros_error_cantidad,
            limites?.maxEvidencias ?: 0,
        )
        FalloSiniestros.ArchivoNoDisponible -> stringResource(R.string.siniestros_error_captura)
        FalloSiniestros.CargaS3Fallida ->
            stringResource(R.string.siniestros_error_subida)
        FalloSiniestros.IntegridadEvidenciaInvalida -> stringResource(R.string.siniestros_error_integridad)
        FalloSiniestros.IdempotenciaConflicto -> stringResource(R.string.siniestros_error_idempotencia)
        FalloSiniestros.BorradorNoEncontrado,
        FalloSiniestros.SolicitudInvalida,
        FalloSiniestros.ServicioNoDisponible,
        FalloSiniestros.RespuestaInvalida,
        -> stringResource(R.string.siniestros_error_generico)
    }
    Text(mensaje, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
}

private fun formatBytes(bytes: Long): String = when {
    bytes >= BYTES_POR_MIB -> "${bytes / BYTES_POR_MIB} MiB"
    bytes >= BYTES_POR_KIB -> "${bytes / BYTES_POR_KIB} KiB"
    else -> "$bytes B"
}

private enum class PantallaSiniestros {
    LISTA,
    FORMULARIO,
    EXPLICACION_PERMISO,
    PERMISO_DENEGADO,
    CAMARA,
    DETALLE,
}

private const val BYTES_POR_KIB = 1024L
private const val BYTES_POR_MIB = 1024L * 1024L
