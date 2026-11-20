package com.solventa.feature.siniestros.datos

import com.solventa.core.network.modelo.EnlaceEvidenciaDto
import com.solventa.feature.siniestros.dominio.ArchivoEvidencia
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import java.io.File
import java.io.IOException
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request

/** Cliente independiente del BFF: nunca lleva autenticacion, interceptores ni logs de URLs. */
class DescargaEvidencias private constructor(
    private val cliente: OkHttpClient,
    private val permitirHttp: Boolean,
    private val ahora: () -> OffsetDateTime,
) {
    constructor() : this(
        OkHttpClient.Builder()
            .followRedirects(false)
            .followSslRedirects(false)
            .retryOnConnectionFailure(false)
            .callTimeout(java.time.Duration.ofSeconds(60))
            .build(),
        false,
        OffsetDateTime::now,
    )

    suspend fun descargar(
        directorio: File,
        solicitarEnlace: suspend () -> Resultado<EnlaceEvidenciaDto>,
    ): Resultado<ArchivoEvidencia> = withContext(Dispatchers.IO) {
        repeat(2) { intento ->
            val enlace = when (val respuesta = solicitarEnlace()) {
                is Resultado.Exito -> respuesta.valor
                is Resultado.Fallo -> return@withContext respuesta
            }
            val url = enlace.url.toHttpUrlOrNull()
            val expiracion = try {
                OffsetDateTime.parse(enlace.expiraEn)
            } catch (_: DateTimeParseException) {
                return@withContext Resultado.Fallo(FalloSiniestros.RespuestaInvalida)
            }
            val nombre = enlace.nombreArchivo.substringAfterLast('/').substringAfterLast('\\')
                .filterNot { it.isISOControl() }
            if (url == null || (!permitirHttp && !url.isHttps) ||
                url.username.isNotEmpty() || url.password.isNotEmpty() ||
                nombre.isBlank() || nombre == "." || nombre == ".." ||
                enlace.tipoContenido.toMediaTypeOrNull() == null
            ) {
                return@withContext Resultado.Fallo(FalloSiniestros.RespuestaInvalida)
            }
            if (!expiracion.isAfter(ahora())) {
                if (intento == 0) return@repeat
                return@withContext Resultado.Fallo(FalloSiniestros.DescargaFallida)
            }
            var archivo: File? = null
            var completo = false
            try {
                val solicitud = Request.Builder().url(enlace.url).get().build()
                cliente.newCall(solicitud).execute().use { respuesta ->
                    if (respuesta.code == 403 && intento == 0) return@repeat
                    if (respuesta.code == 404) return@withContext Resultado.Fallo(FalloSiniestros.EvidenciaNoDisponible)
                    if (!respuesta.isSuccessful) return@withContext Resultado.Fallo(FalloSiniestros.DescargaFallida)
                    val cuerpo = respuesta.body ?: return@withContext Resultado.Fallo(FalloSiniestros.DescargaFallida)
                    val carpeta = File(directorio, UUID.randomUUID().toString())
                    if (!carpeta.mkdirs()) return@withContext Resultado.Fallo(FalloSiniestros.GuardadoFallido)
                    val destino = File(carpeta, nombre)
                    archivo = destino
                    cuerpo.byteStream().use { entrada ->
                        destino.outputStream().use { salida ->
                            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                            while (true) {
                                currentCoroutineContext().ensureActive()
                                val cantidad = entrada.read(buffer)
                                if (cantidad == -1) break
                                salida.write(buffer, 0, cantidad)
                            }
                        }
                    }
                    currentCoroutineContext().ensureActive()
                    completo = true
                    return@withContext Resultado.Exito(ArchivoEvidencia(destino, nombre, enlace.tipoContenido))
                }
            } catch (_: IOException) {
                return@withContext Resultado.Fallo(FalloSiniestros.DescargaFallida)
            } catch (_: SecurityException) {
                return@withContext Resultado.Fallo(FalloSiniestros.GuardadoFallido)
            } finally {
                if (!completo) {
                    archivo?.delete()
                    archivo?.parentFile?.delete()
                }
            }
        }
        Resultado.Fallo(FalloSiniestros.DescargaFallida)
    }

    internal companion object {
        fun paraPruebas(cliente: OkHttpClient, ahora: () -> OffsetDateTime) =
            DescargaEvidencias(cliente, true, ahora)
    }
}
