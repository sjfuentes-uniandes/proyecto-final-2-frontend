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

    /**
     * [subLocal] es solo para desarrollo contra el backend local sin Cognito (ver
     * [SubAutenticadoLocalInterceptor]); en AWS debe ir null.
     */
    fun crearApi(
        baseUrl: String,
        subLocal: String? = null,
        proveedorAccessToken: ProveedorAccessToken,
    ): BffMovilApi {
        val cliente = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            // La selfie pesa varios MB y el proveedor KYC puede tardar: 10 s era corto.
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(proveedorAccessToken))
            .apply { if (!subLocal.isNullOrBlank()) addInterceptor(SubAutenticadoLocalInterceptor(subLocal)) }
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

