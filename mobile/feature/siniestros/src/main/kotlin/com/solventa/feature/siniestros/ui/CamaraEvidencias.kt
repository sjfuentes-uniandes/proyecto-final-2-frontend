package com.solventa.feature.siniestros.ui

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.CameraUnavailableException
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.solventa.feature.siniestros.R
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.delay
import java.io.File
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executor

@Composable
internal fun CamaraEvidencias(
    duracionMaximaSegundos: Int,
    crearFoto: () -> File,
    crearVideo: () -> File,
    alCapturar: (File, TipoEvidencia, Int?) -> Unit,
    alEliminar: (File) -> Unit,
    alVolver: () -> Unit,
    obtenerProveedor: (Context) -> ListenableFuture<ProcessCameraProvider> = ProcessCameraProvider::getInstance,
) {
    val contexto = LocalContext.current
    val propietario = LocalLifecycleOwner.current
    val executor = remember(contexto) { ContextCompat.getMainExecutor(contexto) }
    val vista = remember(contexto) {
        PreviewView(contexto).apply { scaleType = PreviewView.ScaleType.FILL_CENTER }
    }
    val capturar by rememberUpdatedState(alCapturar)
    val eliminar by rememberUpdatedState(alEliminar)
    val volver by rememberUpdatedState(alVolver)
    var proveedor by remember { mutableStateOf<ProcessCameraProvider?>(null) }
    var capturaFoto by remember { mutableStateOf<ImageCapture?>(null) }
    var capturaVideo by remember { mutableStateOf<VideoCapture<Recorder>?>(null) }
    var grabacion by remember { mutableStateOf<Recording?>(null) }
    var errorCamara by remember { mutableStateOf(false) }
    var cancelarGrabacion by remember { mutableStateOf(false) }
    var descartarAlSalir by remember { mutableStateOf(false) }
    var fotoPendiente by remember { mutableStateOf<File?>(null) }

    DisposableEffect(propietario) {
        val futuro = obtenerProveedor(contexto)
        var activo = true
        futuro.addListener(
            {
                if (!activo) return@addListener
                try {
                    val proveedorCamara = futuro.get()
                    val previa = Preview.Builder().build().also { it.surfaceProvider = vista.surfaceProvider }
                    val foto = ImageCapture.Builder().build()
                    val recorder = Recorder.Builder()
                        .setQualitySelector(
                            QualitySelector.from(
                                Quality.HD,
                                FallbackStrategy.lowerQualityOrHigherThan(Quality.SD),
                            ),
                        )
                        .build()
                    val video = VideoCapture.withOutput(recorder)
                    proveedorCamara.unbindAll()
                    proveedorCamara.bindToLifecycle(
                        propietario,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        previa,
                        foto,
                        video,
                    )
                    proveedor = proveedorCamara
                    capturaFoto = foto
                    capturaVideo = video
                } catch (e: ExecutionException) {
                    errorCamara = true
                } catch (e: InterruptedException) {
                    Thread.currentThread().interrupt()
                    errorCamara = true
                } catch (e: CameraUnavailableException) {
                    errorCamara = true
                } catch (e: IllegalArgumentException) {
                    errorCamara = true
                }
            },
            executor,
        )
        onDispose {
            activo = false
            descartarAlSalir = true
            cancelarGrabacion = true
            fotoPendiente?.let(eliminar)
            grabacion?.stop()
            proveedor?.unbindAll()
        }
    }

    LaunchedEffect(grabacion, duracionMaximaSegundos) {
        if (grabacion != null) {
            delay((duracionMaximaSegundos * MILLIS_POR_SEGUNDO - MARGEN_DE_SEGURIDAD_MILLIS).coerceAtLeast(0L))
            grabacion?.stop()
        }
    }

    androidx.activity.compose.BackHandler {
        val activa = grabacion
        if (activa != null) {
            cancelarGrabacion = true
            activa.stop()
        } else {
            alVolver()
        }
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.siniestros_camara_titulo),
                style = MaterialTheme.typography.titleLarge,
            )
            TextButton(
                onClick = {
                    val activa = grabacion
                    if (activa == null) alVolver()
                    else {
                        cancelarGrabacion = true
                        activa.stop()
                    }
                },
            ) {
                Text(stringResource(R.string.siniestros_volver))
            }
        }
        if (errorCamara) {
            Text(
                stringResource(R.string.siniestros_camara_error),
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(16.dp),
            )
        } else {
            AndroidView(
                factory = { vista },
                modifier = Modifier.weight(1f).fillMaxWidth().testTag(EtiquetasCamara.PREVIA),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(
                onClick = {
                    val foto = capturaFoto ?: return@Button
                    val archivo = crearFoto()
                    fotoPendiente = archivo
                    try {
                        foto.takePicture(
                            ImageCapture.OutputFileOptions.Builder(archivo).build(),
                            executor,
                            object : ImageCapture.OnImageSavedCallback {
                                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                    fotoPendiente = null
                                    if (descartarAlSalir) eliminar(archivo)
                                    else capturar(archivo, TipoEvidencia.FOTOGRAFIA, null)
                                }

                                override fun onError(exception: ImageCaptureException) {
                                    fotoPendiente = null
                                    eliminar(archivo)
                                    errorCamara = true
                                }
                            },
                        )
                    } catch (e: IllegalStateException) {
                        fotoPendiente = null
                        eliminar(archivo)
                        errorCamara = true
                    }
                },
                enabled = capturaFoto != null && grabacion == null && !errorCamara,
                modifier = Modifier.weight(1f).heightIn(min = 56.dp).testTag(EtiquetasCamara.FOTO),
            ) {
                Icon(Icons.Filled.CameraAlt, contentDescription = null)
                Text(stringResource(R.string.siniestros_tomar_foto))
            }
            Button(
                onClick = {
                    val video = capturaVideo ?: return@Button
                    val archivo = crearVideo()
                    cancelarGrabacion = false
                        try {
                            grabacion = video.output
                                .prepareRecording(contexto, FileOutputOptions.Builder(archivo).build())
                                .start(executor) { evento ->
                                    if (evento is VideoRecordEvent.Finalize) {
                                        grabacion = null
                                        if (cancelarGrabacion || evento.hasError()) {
                                            eliminar(archivo)
                                            if (evento.hasError() && !cancelarGrabacion) errorCamara = true
                                            if (cancelarGrabacion && !descartarAlSalir) volver()
                                        } else {
                                            val segundos = (
                                                (evento.recordingStats.recordedDurationNanos + NANOS_POR_SEGUNDO - 1) /
                                                    NANOS_POR_SEGUNDO
                                                ).toInt().coerceAtLeast(1)
                                            capturar(archivo, TipoEvidencia.VIDEO, segundos)
                                        }
                                }
                            }
                        } catch (e: IllegalStateException) {
                            eliminar(archivo)
                            errorCamara = true
                        }
                },
                enabled = capturaVideo != null && !errorCamara,
                modifier = Modifier.weight(1f).heightIn(min = 56.dp).testTag(EtiquetasCamara.VIDEO),
            ) {
                Icon(
                    if (grabacion == null) Icons.Filled.Videocam else Icons.Filled.Stop,
                    contentDescription = null,
                )
                Text(
                    stringResource(
                        if (grabacion == null) R.string.siniestros_grabar_video else R.string.siniestros_detener_video,
                    ),
                )
            }
        }
        if (grabacion != null) {
            Text(
                stringResource(R.string.siniestros_video_limite, duracionMaximaSegundos),
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 16.dp),
            )
        }
    }
}

internal object EtiquetasCamara {
    const val PREVIA = "siniestros_camara_previa"
    const val FOTO = "siniestros_camara_foto"
    const val VIDEO = "siniestros_camara_video"
}

private const val MILLIS_POR_SEGUNDO = 1000L
private const val MARGEN_DE_SEGURIDAD_MILLIS = 250L
private const val NANOS_POR_SEGUNDO = 1_000_000_000L
