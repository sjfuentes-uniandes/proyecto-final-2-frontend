package com.solventa.core.network

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.create
import java.util.concurrent.TimeUnit

/** Fábrica del cliente HTTP del BFF móvil. Sin estado: una instancia por proceso basta. */
object RedModule {
    private val json = Json { ignoreUnknownKeys = true }

    fun crearApi(baseUrl: String, proveedorAccessToken: ProveedorAccessToken): BffMovilApi {
        val cliente = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(proveedorAccessToken))
            .addInterceptor(CorrelationLoggingInterceptor())
            .build()

        val base = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(base)
            .client(cliente)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create()
    }
}

