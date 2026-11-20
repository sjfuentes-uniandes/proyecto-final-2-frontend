package com.solventa.feature.siniestros.datos

import android.Manifest
import android.app.Application
import android.content.Context
import android.location.LocationManager
import com.solventa.feature.siniestros.dominio.MotivoSinUbicacion
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import kotlin.test.assertEquals

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [33])
class ProveedorUbicacionAndroidTest {
    private val contexto = RuntimeEnvironment.getApplication()
    private lateinit var proveedor: ProveedorUbicacionAndroid

    @Before
    fun preparar() {
        shadowOf(contexto).denyPermissions(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        contexto.getSharedPreferences("permiso_ubicacion", Context.MODE_PRIVATE).edit().clear().commit()
        proveedor = ProveedorUbicacionAndroid(contexto)
    }

    @Test
    fun `permiso real prevalece sobre historial y distingue preciso aproximado y rechazos`() {
        assertEquals(PermisoUbicacion.NO_SOLICITADO, proveedor.permisoActual())
        proveedor.registrarRespuesta(false)
        assertEquals(PermisoUbicacion.DENEGADO, proveedor.permisoActual())
        proveedor.registrarRespuesta(true)
        assertEquals(PermisoUbicacion.DENEGADO_PERMANENTEMENTE, proveedor.permisoActual())
        shadowOf(contexto).grantPermissions(Manifest.permission.ACCESS_COARSE_LOCATION)
        assertEquals(PermisoUbicacion.APROXIMADO, proveedor.permisoActual())
        shadowOf(contexto).grantPermissions(Manifest.permission.ACCESS_FINE_LOCATION)
        assertEquals(PermisoUbicacion.PRECISO, proveedor.permisoActual())
    }

    @Test
    fun `sin permiso o proveedor desactivado no entrega coordenadas`() = runTest {
        proveedor.registrarRespuesta(true)
        assertEquals(UbicacionCapturada(PermisoUbicacion.DENEGADO_PERMANENTEMENTE), proveedor.capturar().lectura)
        shadowOf(contexto).grantPermissions(Manifest.permission.ACCESS_COARSE_LOCATION)
        shadowOf(contexto.getSystemService(LocationManager::class.java)).setLocationEnabled(false)
        val captura = proveedor.capturar()
        assertEquals(UbicacionCapturada(PermisoUbicacion.APROXIMADO), captura.lectura)
        assertEquals(MotivoSinUbicacion.DESACTIVADA, captura.motivo)
    }
}
