package com.solventa.core.network

import com.solventa.core.network.modelo.RegistroVerificacionDto
import com.solventa.core.network.modelo.RegistroVerificacionSolicitud
import com.solventa.core.network.modelo.SesionDto
import com.solventa.core.network.modelo.ValidacionRegistroDto
import com.solventa.core.network.modelo.ValidacionRegistroSolicitud
import com.solventa.core.network.modelo.VerificacionIdentidadDto
import com.solventa.core.network.modelo.VerificacionIdentidadSolicitud
import com.solventa.core.network.modelo.VinculacionDto
import com.solventa.core.network.modelo.VinculacionSolicitud
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** Rutas de bff-movil usadas por la app (contrato: contracts/openapi/bff-movil.yaml). */
interface BffMovilApi {
    @GET("v1/sesion")
    suspend fun sesion(): Response<SesionDto>

    @POST("v1/identidad/verificaciones")
    suspend fun verificarIdentidad(@Body solicitud: VerificacionIdentidadSolicitud): Response<VerificacionIdentidadDto>

    @POST("v1/registro/verificaciones")
    suspend fun verificarRegistro(@Body solicitud: RegistroVerificacionSolicitud): Response<RegistroVerificacionDto>

    @POST("v1/registro/vinculacion")
    suspend fun vincularRegistro(@Body solicitud: VinculacionSolicitud): Response<VinculacionDto>

    @POST("v1/registro/validaciones")
    suspend fun validarRegistroLocal(@Body solicitud: ValidacionRegistroSolicitud): Response<ValidacionRegistroDto>

    @GET("health")
    suspend fun health(): Response<Map<String, String>>
}
