package com.solventa.feature.siniestros.datos

import android.content.Context
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.ArchivoImportado
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.ImportadorEvidencias
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import java.io.File
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext

class ImportadorEvidenciasAndroid(
    contexto: Context,
    private val almacen: AlmacenEvidencias,
) : ImportadorEvidencias {
    private val resolver = contexto.applicationContext.contentResolver

    override suspend fun importar(uri: String, limites: LimitesSiniestros): Resultado<ArchivoImportado> {
        var temporal: File? = null
        var conservar = false
        try {
            val resultado = withContext(Dispatchers.IO) {
                try {
                    val origen = Uri.parse(uri)
                    if (origen.scheme != "content") return@withContext Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
                    val mime = resolver.getType(origen)
                    val (tipo, extension, maximo, formatos) = when (mime) {
                        "image/jpeg" -> Formato(TipoEvidencia.FOTOGRAFIA, "jpg", limites.tamanoMaximoFotoBytes, limites.formatosFoto)
                        "image/png" -> Formato(TipoEvidencia.FOTOGRAFIA, "png", limites.tamanoMaximoFotoBytes, limites.formatosFoto)
                        "video/mp4" -> Formato(TipoEvidencia.VIDEO, "mp4", limites.tamanoMaximoVideoBytes, limites.formatosVideo)
                        else -> return@withContext Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
                    }
                    if (mime !in formatos) return@withContext Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
                    val archivo = almacen.crearArchivo(extension)
                    temporal = archivo
                    val nombre = resolver.query(origen, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                        if (cursor.moveToFirst()) cursor.getString(0) else null
                    }?.substringAfterLast('/')?.substringAfterLast('\\')
                        ?.filterNot { it.isISOControl() }?.take(255)?.takeIf { it.isNotBlank() }
                        ?: archivo.name
                    val entrada = resolver.openInputStream(origen)
                        ?: return@withContext Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
                    var total = 0L
                    entrada.use {
                        archivo.outputStream().use { salida ->
                            val buffer = ByteArray(8192)
                            while (true) {
                                currentCoroutineContext().ensureActive()
                                val leidos = it.read(buffer)
                                if (leidos < 0) break
                                if (leidos.toLong() > maximo - total) {
                                    return@withContext Resultado.Fallo(FalloSiniestros.TamanoEvidenciaExcedido)
                                }
                                salida.write(buffer, 0, leidos)
                                total += leidos
                            }
                        }
                    }
                    if (total == 0L) return@withContext Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
                    val duracion = if (tipo == TipoEvidencia.FOTOGRAFIA) {
                        val opciones = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                        archivo.inputStream().use { BitmapFactory.decodeStream(it, null, opciones) }
                        if (opciones.outWidth <= 0 || opciones.outHeight <= 0 || opciones.outMimeType != mime) {
                            return@withContext Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
                        }
                        null
                    } else {
                        val lector = MediaMetadataRetriever()
                        try {
                            try {
                                lector.setDataSource(archivo.absolutePath)
                            } catch (_: RuntimeException) {
                                return@withContext Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
                            }
                            if (lector.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE) != mime) {
                                return@withContext Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
                            }
                            val milisegundos = lector.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
                            if (milisegundos == null || milisegundos <= 0) {
                                return@withContext Resultado.Fallo(FalloSiniestros.DuracionVideoNoDisponible)
                            }
                            if (milisegundos > limites.duracionMaximaVideoSegundos.toLong() * 1000) {
                                return@withContext Resultado.Fallo(FalloSiniestros.DuracionVideoExcedida)
                            }
                            ((milisegundos + 999) / 1000).toInt()
                        } finally {
                            lector.release()
                        }
                    }
                    Resultado.Exito(ArchivoImportado(archivo, nombre, tipo, mime, duracion))
                } catch (_: IOException) {
                    Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
                } catch (_: SecurityException) {
                    Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
                } catch (_: IllegalArgumentException) {
                    Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
                }
            }
            conservar = resultado is Resultado.Exito
            return resultado
        } finally {
            if (!conservar) temporal?.let(almacen::eliminar)
        }
    }

    private data class Formato(
        val tipo: TipoEvidencia,
        val extension: String,
        val maximo: Long,
        val formatos: List<String>,
    )
}
