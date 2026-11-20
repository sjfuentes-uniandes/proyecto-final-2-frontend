package com.solventa.feature.siniestros.datos

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.solventa.feature.siniestros.dominio.CapturaUbicacion
import com.solventa.feature.siniestros.dominio.MotivoSinUbicacion
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.ProveedorUbicacion
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import java.time.Instant
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

class ProveedorUbicacionAndroid(contexto: Context) : ProveedorUbicacion {
    private val contexto = contexto.applicationContext
    private val cliente = LocationServices.getFusedLocationProviderClient(this.contexto)
    private val preferencias = this.contexto.getSharedPreferences("permiso_ubicacion", Context.MODE_PRIVATE)

    override fun permisoActual(): PermisoUbicacion = when {
        concedido(Manifest.permission.ACCESS_FINE_LOCATION) -> PermisoUbicacion.PRECISO
        concedido(Manifest.permission.ACCESS_COARSE_LOCATION) -> PermisoUbicacion.APROXIMADO
        preferencias.getBoolean("permanente", false) -> PermisoUbicacion.DENEGADO_PERMANENTEMENTE
        preferencias.getBoolean("solicitado", false) -> PermisoUbicacion.DENEGADO
        else -> PermisoUbicacion.NO_SOLICITADO
    }

    override fun registrarRespuesta(permanente: Boolean) {
        preferencias.edit().putBoolean("solicitado", true).putBoolean("permanente", permanente).apply()
    }

    private fun concedido(permiso: String) =
        ContextCompat.checkSelfPermission(contexto, permiso) == PackageManager.PERMISSION_GRANTED

    @SuppressLint("MissingPermission")
    override suspend fun capturar(): CapturaUbicacion {
        val permiso = permisoActual()
        if (permiso != PermisoUbicacion.PRECISO && permiso != PermisoUbicacion.APROXIMADO) {
            return CapturaUbicacion(UbicacionCapturada(permiso))
        }
        val gestor = contexto.getSystemService(LocationManager::class.java)
        if (!LocationManagerCompat.isLocationEnabled(gestor)) return CapturaUbicacion(UbicacionCapturada(permiso), MotivoSinUbicacion.DESACTIVADA)
        return try {
            withTimeoutOrNull(25_000) {
                suspendCancellableCoroutine { continuacion ->
                    val token = CancellationTokenSource()
                    continuacion.invokeOnCancellation { token.cancel() }
                    val solicitud = CurrentLocationRequest.Builder()
                        .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                        .setMaxUpdateAgeMillis(0)
                        .setDurationMillis(20_000)
                        .build()
                    cliente.getCurrentLocation(solicitud, token.token)
                        .addOnSuccessListener { lectura ->
                            if (continuacion.isActive) continuacion.resume(convertir(lectura))
                        }
                        .addOnFailureListener {
                            if (continuacion.isActive) continuacion.resume(
                                CapturaUbicacion(UbicacionCapturada(permisoActual()), MotivoSinUbicacion.ERROR),
                            )
                        }
                        .addOnCanceledListener {
                            if (continuacion.isActive) continuacion.resume(
                                CapturaUbicacion(UbicacionCapturada(permisoActual()), MotivoSinUbicacion.SIN_LECTURA),
                            )
                        }
                }
            } ?: CapturaUbicacion(UbicacionCapturada(permisoActual()), MotivoSinUbicacion.TIEMPO_AGOTADO)
        } catch (_: SecurityException) {
            CapturaUbicacion(UbicacionCapturada(permisoActual()), MotivoSinUbicacion.ERROR)
        }
    }

    private fun convertir(lectura: Location?): CapturaUbicacion {
        val permiso = permisoActual()
        if (lectura == null || !lectura.hasAccuracy() ||
            (permiso != PermisoUbicacion.PRECISO && permiso != PermisoUbicacion.APROXIMADO)
        ) return CapturaUbicacion(UbicacionCapturada(permiso), MotivoSinUbicacion.SIN_LECTURA)
        val ubicacion = UbicacionCapturada(
            permiso, lectura.latitude, lectura.longitude, lectura.accuracy.toDouble(),
            Instant.ofEpochMilli(lectura.time).toString(),
        )
        return if (ubicacion.esValida()) CapturaUbicacion(ubicacion)
        else CapturaUbicacion(UbicacionCapturada(permiso), MotivoSinUbicacion.SIN_LECTURA)
    }
}
