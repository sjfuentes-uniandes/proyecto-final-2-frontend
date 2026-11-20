package com.solventa.feature.siniestros.datos

import com.solventa.core.network.modelo.CargaDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.IOException

/** HTTP aislado: no comparte interceptor, token ni logging del cliente BFF. */
class CargaS3 private constructor(private val cliente: OkHttpClient) {
    constructor() : this(clientePredeterminado())

    internal companion object {
        fun paraPruebas(cliente: OkHttpClient) = CargaS3(cliente)

        private fun clientePredeterminado() = OkHttpClient.Builder()
            .followRedirects(false)
            .followSslRedirects(false)
            .build()
        private const val METODO_POST = "POST"
        private const val CAMPO_ARCHIVO = "file"
        private const val CODIGO_FIRMA_RECHAZADA = 403
    }

    suspend fun subir(archivo: File, tipoContenido: String, carga: CargaDto): ResultadoCargaS3 =
        withContext(Dispatchers.IO) {
            if (carga.metodo != METODO_POST) return@withContext ResultadoCargaS3.Fallo
            val formulario = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .apply {
                    carga.campos.forEach { (nombre, valor) -> addFormDataPart(nombre, valor) }
                    addFormDataPart(
                        CAMPO_ARCHIVO,
                        archivo.name,
                        archivo.asRequestBody(tipoContenido.toMediaType()),
                    )
                }
                .build()
            val solicitud = try {
                Request.Builder().url(carga.url).post(formulario).build()
            } catch (e: IllegalArgumentException) {
                return@withContext ResultadoCargaS3.Fallo
            }
            try {
                cliente.newCall(solicitud).execute().use { respuesta ->
                    when {
                        respuesta.isSuccessful -> ResultadoCargaS3.Exito
                        respuesta.code == CODIGO_FIRMA_RECHAZADA -> ResultadoCargaS3.FirmaExpirada
                        else -> ResultadoCargaS3.Fallo
                    }
                }
            } catch (e: IOException) {
                ResultadoCargaS3.Fallo
            }
        }
}

sealed interface ResultadoCargaS3 {
    data object Exito : ResultadoCargaS3
    data object FirmaExpirada : ResultadoCargaS3
    data object Fallo : ResultadoCargaS3
}
