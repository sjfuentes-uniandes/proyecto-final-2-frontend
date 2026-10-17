package com.solventa.core.network

import com.solventa.core.network.modelo.ConsentimientoDto
import com.solventa.core.network.modelo.SesionDto
import com.solventa.core.network.modelo.SolicitudOtorgarDto
import com.solventa.core.network.modelo.TextoVigenteDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Rutas de bff-movil usadas por la app (contrato: contracts/openapi/bff-movil.yaml). */
interface BffMovilApi {
    @GET("v1/sesion")
    suspend fun sesion(): Response<SesionDto>

    @GET("health")
    suspend fun health(): Response<Map<String, String>>

    /** HU-M08: el titular es el del token; ninguna ruta lleva `clienteId`. */
    @GET("v1/consentimientos")
    suspend fun listarConsentimientos(): Response<List<ConsentimientoDto>>

    @POST("v1/consentimientos")
    suspend fun otorgarConsentimiento(
        @Header("Idempotency-Key") claveIdempotencia: String,
        @Body solicitud: SolicitudOtorgarDto,
    ): Response<ConsentimientoDto>

    @GET("v1/consentimientos/{consentimientoId}")
    suspend fun consentimiento(@Path("consentimientoId") consentimientoId: String): Response<ConsentimientoDto>

    @GET("v1/consentimientos/texto-vigente")
    suspend fun textoVigente(
        @Query("proposito") proposito: String,
        @Query("idioma") idioma: String,
    ): Response<TextoVigenteDto>
}
