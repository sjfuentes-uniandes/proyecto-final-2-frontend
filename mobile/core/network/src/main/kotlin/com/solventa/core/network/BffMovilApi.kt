package com.solventa.core.network

import com.solventa.core.network.modelo.SesionDto
import retrofit2.Response
import retrofit2.http.GET

/** Rutas de bff-movil usadas por la app (contrato: contracts/openapi/bff-movil.yaml). */
interface BffMovilApi {
    @GET("v1/sesion")
    suspend fun sesion(): Response<SesionDto>

    @GET("health")
    suspend fun health(): Response<Map<String, String>>
}
