package com.solventa.feature.siniestros.ui

import android.Manifest
import android.content.Intent
import android.content.ActivityNotFoundException
import android.app.Activity
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.core.app.ActivityCompat
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.solventa.feature.siniestros.EventoSiniestros
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.SiniestrosViewModel
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.PermisoUbicacion

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
    var adjuntandoAlBorrador by rememberSaveable { mutableStateOf(false) }
    var siniestroSeleccionado by rememberSaveable { mutableStateOf<String?>(null) }
    var explicarUbicacion by rememberSaveable { mutableStateOf(false) }
    val contexto = LocalContext.current
    val ciclo = LocalLifecycleOwner.current
    DisposableEffect(ciclo, viewModel) {
        val observador = LifecycleEventObserver { _, evento ->
            if (evento == Lifecycle.Event.ON_RESUME) viewModel.comprobarPermisoUbicacion()
            if (evento == Lifecycle.Event.ON_STOP) viewModel.cancelarCapturaUbicacion()
        }
        ciclo.lifecycle.addObserver(observador)
        onDispose {
            ciclo.lifecycle.removeObserver(observador)
            viewModel.cancelarCapturaUbicacion()
        }
    }
    val permisoUbicacion = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        val actividad = contexto.actividadUbicacion()
        val denegado = viewModel.permisoUbicacionActual() !in listOf(PermisoUbicacion.PRECISO, PermisoUbicacion.APROXIMADO)
        val permanente = denegado && actividad != null &&
            !ActivityCompat.shouldShowRequestPermissionRationale(actividad, Manifest.permission.ACCESS_COARSE_LOCATION)
        viewModel.respuestaPermisoUbicacion(permanente)
    }
    val tareas = rememberCoroutineScope()
    val guardarEvidencia = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { resultado ->
        val archivo = viewModel.uiState.value.archivoPorGuardar
        val destino = resultado.data?.data
        if (resultado.resultCode == Activity.RESULT_OK && destino != null && archivo != null) {
            tareas.launch {
                val guardado = withContext(Dispatchers.IO) {
                    try {
                        val salida = contexto.contentResolver.openOutputStream(destino)
                            ?: return@withContext false
                        salida.use { salidaArchivo ->
                            archivo.archivo.inputStream().use { entrada -> entrada.copyTo(salidaArchivo) }
                        }
                        true
                    } catch (_: IOException) {
                        false
                    } catch (_: SecurityException) {
                        false
                    }
                }
                if (!guardado) viewModel.notificarFalloAcceso(FalloSiniestros.GuardadoFallido)
                viewModel.finalizarGuardadoEvidencia(guardado)
            }
        } else {
            viewModel.finalizarGuardadoEvidencia()
        }
    }

    val permisoCamara = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { concedido ->
        permisoDenegado = !concedido
        if (concedido) pantalla = PantallaSiniestros.CAMARA
        else pantalla = PantallaSiniestros.PERMISO_DENEGADO
    }

    val selectorArchivo = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null && pantalla == PantallaSiniestros.FORMULARIO) viewModel.adjuntarArchivo(uri.toString())
    }

    LaunchedEffect(viewModel) {
        viewModel.eventos.collect { evento ->
            when (evento) {
                EventoSiniestros.IrALogin -> onIrALogin()
                EventoSiniestros.SolicitarUbicacion -> { explicarUbicacion = true }
                EventoSiniestros.AbrirPendienteLocal -> {
                    adjuntandoAlBorrador = false
                    pantalla = PantallaSiniestros.FORMULARIO
                }
                is EventoSiniestros.EvidenciaLista -> {
                    if (pantalla != PantallaSiniestros.REPORTE || siniestroSeleccionado != evento.siniestroId) {
                        if (evento.guardar) viewModel.finalizarGuardadoEvidencia()
                        return@collect
                    }
                    try {
                        if (evento.guardar) {
                            guardarEvidencia.launch(
                                Intent(Intent.ACTION_CREATE_DOCUMENT)
                                    .addCategory(Intent.CATEGORY_OPENABLE)
                                    .setType(evento.archivo.tipoContenido)
                                    .putExtra(Intent.EXTRA_TITLE, evento.archivo.nombreArchivo),
                            )
                        } else {
                            val uri = FileProvider.getUriForFile(
                                contexto, "${contexto.packageName}.evidencias", evento.archivo.archivo,
                            )
                            contexto.startActivity(
                                Intent(Intent.ACTION_VIEW).setDataAndType(uri, evento.archivo.tipoContenido)
                                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION),
                            )
                        }
                    } catch (_: ActivityNotFoundException) {
                        viewModel.notificarFalloAcceso(
                            if (evento.guardar) FalloSiniestros.GuardadoFallido else FalloSiniestros.VisorNoDisponible,
                        )
                        if (evento.guardar) viewModel.finalizarGuardadoEvidencia()
                    } catch (_: SecurityException) {
                        viewModel.notificarFalloAcceso(FalloSiniestros.NoAutorizado)
                        if (evento.guardar) viewModel.finalizarGuardadoEvidencia()
                    } catch (_: IllegalArgumentException) {
                        viewModel.notificarFalloAcceso(FalloSiniestros.EvidenciaNoDisponible)
                        if (evento.guardar) viewModel.finalizarGuardadoEvidencia()
                    }
                }
                is EventoSiniestros.AbrirDetalle -> {
                    borradorSeleccionado = evento.borradorId
                    adjuntandoAlBorrador = false
                    pantalla = PantallaSiniestros.DETALLE
                    viewModel.consultarDetalle(evento.borradorId)
                }
                is EventoSiniestros.ReporteEnviado -> {
                    siniestroSeleccionado = evento.siniestroId
                    adjuntandoAlBorrador = false
                    pantalla = PantallaSiniestros.REPORTE
                    viewModel.consultarSiniestro(evento.siniestroId)
                }
            }
        }
    }

    BackHandler(enabled = pantalla != PantallaSiniestros.LISTA && pantalla != PantallaSiniestros.CAMARA) {
        if (estado.enviando || estado.importandoEvidencia) return@BackHandler
        when (pantalla) {
            PantallaSiniestros.FORMULARIO -> descartarVisible = true
            PantallaSiniestros.DETALLE, PantallaSiniestros.REPORTE -> {
                viewModel.cancelarAccesoEvidencia()
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
                adjuntandoAlBorrador = false
                pantalla = PantallaSiniestros.FORMULARIO
            },
            alAbrir = { id ->
                borradorSeleccionado = id
                adjuntandoAlBorrador = false
                pantalla = PantallaSiniestros.DETALLE
                viewModel.consultarDetalle(id)
            },
            alAbrirLocal = viewModel::abrirPendienteLocal,
            alAbrirReporte = { id ->
                siniestroSeleccionado = id
                pantalla = PantallaSiniestros.REPORTE
                viewModel.consultarSiniestro(id)
            },
            alCargarMas = { viewModel.cargarHistorial(mas = true) },
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
            alAdjuntarArchivo = {
                if (viewModel.prepararSeleccionArchivo()) {
                    try {
                        selectorArchivo.launch(arrayOf("*/*"))
                    } catch (_: ActivityNotFoundException) {
                        viewModel.falloSelectorArchivo()
                    } catch (_: SecurityException) {
                        viewModel.falloSelectorArchivo()
                    }
                }
            },
            alEliminarEvidencia = viewModel::eliminarCaptura,
            alReportar = viewModel::reportar,
            alSeleccionarCausa = viewModel::seleccionarCausa,
            alCambiarFecha = viewModel::cambiarFechaEvento,
            alReintentarCoberturas = viewModel::cargarCoberturas,
            alEliminarRegistrada = viewModel::eliminarEvidenciaRegistrada,
            alReintentarPolizas = viewModel::reintentarCarga,
            alUbicacion = viewModel::iniciarUbicacion,
            alGuardarUbicacion = viewModel::reintentarGuardarUbicacion,
            alGuardarBorrador = viewModel::guardarBorrador,
            alVolverAPendientes = {
                viewModel.cancelarFormulario()
                adjuntandoAlBorrador = false
                pantalla = PantallaSiniestros.LISTA
            },
            alAjustesUbicacion = {
                contexto.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${contexto.packageName}")))
            },
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
            alAdjuntarEvidencia = {
                val id = borradorSeleccionado
                if (id != null && viewModel.prepararAdjuntarEvidencia(id)) {
                    adjuntandoAlBorrador = true
                    pantalla = PantallaSiniestros.FORMULARIO
                }
            },
            alVolver = {
                pantalla = PantallaSiniestros.LISTA
                viewModel.refrescarLista()
            },
        )
        PantallaSiniestros.REPORTE -> ReporteDetalleScreen(
            detalle = estado.reporte,
            estado = estado,
            alReintentar = { siniestroSeleccionado?.let(viewModel::consultarSiniestro) },
            alAccederEvidencia = { evidenciaId, guardar ->
                viewModel.accederEvidencia(evidenciaId, File(contexto.cacheDir, "evidencias_descargadas"), guardar)
            },
            alVolver = {
                viewModel.cancelarAccesoEvidencia()
                pantalla = PantallaSiniestros.LISTA
                viewModel.refrescarLista()
            },
        )
    }

    if (explicarUbicacion) {
        val permanente = viewModel.permisoUbicacionActual() == PermisoUbicacion.DENEGADO_PERMANENTEMENTE
        AlertDialog(
            onDismissRequest = { explicarUbicacion = false },
            title = { Text(stringResource(R.string.ubicacion_explicacion_titulo)) },
            text = { Text(stringResource(R.string.ubicacion_explicacion)) },
            confirmButton = {
                TextButton(onClick = {
                    explicarUbicacion = false
                    when (viewModel.permisoUbicacionActual()) {
                        PermisoUbicacion.PRECISO, PermisoUbicacion.APROXIMADO -> viewModel.capturarUbicacion()
                        PermisoUbicacion.DENEGADO_PERMANENTEMENTE -> contexto.startActivity(
                            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${contexto.packageName}")),
                        )
                        else -> permisoUbicacion.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                    }
                }) { Text(stringResource(if (permanente) R.string.ubicacion_abrir_ajustes else R.string.ubicacion_continuar)) }
            },
            dismissButton = {
                TextButton(onClick = { explicarUbicacion = false }) { Text(stringResource(R.string.siniestros_cancelar)) }
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
                    tareas.launch {
                        if (viewModel.descartarPendienteLocal()) {
                            if (adjuntandoAlBorrador) {
                                viewModel.cancelarAdjuntarEvidencia()
                                adjuntandoAlBorrador = false
                                pantalla = PantallaSiniestros.DETALLE
                            } else {
                                viewModel.cancelarFormulario()
                                pantalla = PantallaSiniestros.LISTA
                            }
                        }
                    }
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
        FalloSiniestros.CausaObligatoria -> stringResource(R.string.siniestros_error_causa)
        FalloSiniestros.FechaEventoInvalida -> stringResource(R.string.siniestros_error_fecha)
        FalloSiniestros.EvidenciaObligatoria -> stringResource(R.string.siniestros_error_evidencia_obligatoria)
        FalloSiniestros.EvidenciaNoCargada -> stringResource(R.string.siniestros_error_evidencia_pendiente)
        FalloSiniestros.BorradorModificado -> stringResource(R.string.siniestros_error_modificado)
        FalloSiniestros.BorradorConvertido -> stringResource(R.string.siniestros_error_convertido)
        FalloSiniestros.SolicitudInvalida -> stringResource(R.string.siniestros_error_datos)
        FalloSiniestros.TipoEvidenciaNoAdmitido, FalloSiniestros.EvidenciaNoAdmitida ->
            stringResource(R.string.siniestros_error_tipo)
        FalloSiniestros.DuracionVideoNoDisponible -> stringResource(R.string.siniestros_error_duracion_no_disponible)
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
        FalloSiniestros.EvidenciaNoDisponible -> stringResource(R.string.siniestros_error_evidencia_no_disponible)
        FalloSiniestros.DescargaFallida -> stringResource(R.string.siniestros_error_descarga)
        FalloSiniestros.VisorNoDisponible -> stringResource(R.string.siniestros_error_visor)
        FalloSiniestros.GuardadoFallido -> stringResource(R.string.siniestros_error_guardado)
        FalloSiniestros.PendienteLocalNoDisponible -> stringResource(R.string.siniestros_error_pendiente_local)
        FalloSiniestros.UbicacionInvalida -> stringResource(R.string.ubicacion_error_validacion)
        FalloSiniestros.CargaS3Fallida ->
            stringResource(R.string.siniestros_error_subida)
        FalloSiniestros.IntegridadEvidenciaInvalida -> stringResource(R.string.siniestros_error_integridad)
        FalloSiniestros.IdempotenciaConflicto -> stringResource(R.string.siniestros_error_idempotencia)
        FalloSiniestros.BorradorNoEncontrado,
        FalloSiniestros.SiniestroNoEncontrado,
        FalloSiniestros.ServicioNoDisponible,
        FalloSiniestros.RespuestaInvalida,
        -> stringResource(R.string.siniestros_error_generico)
    }
    AvisoSiniestro(mensaje)
}

private tailrec fun Context.actividadUbicacion(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.actividadUbicacion()
    else -> null
}

private enum class PantallaSiniestros {
    LISTA,
    FORMULARIO,
    EXPLICACION_PERMISO,
    PERMISO_DENEGADO,
    CAMARA,
    DETALLE,
    REPORTE,
}
