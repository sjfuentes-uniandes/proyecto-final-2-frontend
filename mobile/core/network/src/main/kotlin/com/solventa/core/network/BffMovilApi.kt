package com.solventa.core.network

import com.solventa.core.network.modelo.ConsentimientoDto
import com.solventa.core.network.modelo.HistorialDto
import com.solventa.core.network.modelo.PolizaDetalleDto
import com.solventa.core.network.modelo.PolizaResumenDto
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
import com.solventa.core.network.modelo.RegistroVerificacionDto
import com.solventa.core.network.modelo.RegistroVerificacionSolicitud
import com.solventa.core.network.modelo.ValidacionRegistroDto
import com.solventa.core.network.modelo.ValidacionRegistroSolicitud
import com.solventa.core.network.modelo.VerificacionIdentidadDto
import com.solventa.core.network.modelo.VerificacionIdentidadSolicitud
import com.solventa.core.network.modelo.VinculacionDto
import com.solventa.core.network.modelo.VinculacionSolicitud

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

    /** HU-M10: pólizas del titular del token (incluidas las vencidas); ninguna ruta lleva `clienteId`. */
    @GET("v1/polizas")
    suspend fun polizas(): Response<List<PolizaResumenDto>>

    @GET("v1/polizas/{poliza_id}")
    suspend fun poliza(@Path("poliza_id") polizaId: String): Response<PolizaDetalleDto>

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

    /** HU-M09: sin cuerpo ni `Idempotency-Key`; el servidor es idempotente por estado. */
    @POST("v1/consentimientos/{consentimientoId}/revocacion")
    suspend fun revocarConsentimiento(@Path("consentimientoId") consentimientoId: String): Response<ConsentimientoDto>

    @GET("v1/consentimientos/{consentimientoId}/historial")
    suspend fun historialConsentimiento(@Path("consentimientoId") consentimientoId: String): Response<HistorialDto>

    @GET("v1/consentimientos/texto-vigente")
    suspend fun textoVigente(
        @Query("proposito") proposito: String,
        @Query("idioma") idioma: String,
    ): Response<TextoVigenteDto>
}
