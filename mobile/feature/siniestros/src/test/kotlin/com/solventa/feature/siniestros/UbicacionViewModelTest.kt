package com.solventa.feature.siniestros

import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Vigencia
import com.solventa.feature.billetera.dominio.Resultado as ResultadoPoliza
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.CapturaUbicacion
import com.solventa.feature.siniestros.dominio.EnvioSiniestro
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.EstadoUbicacion
import com.solventa.feature.siniestros.dominio.Evidencia
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.PaginaSiniestros
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.ProveedorUbicacion
import com.solventa.feature.siniestros.dominio.ReglasUbicacion
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import com.solventa.feature.siniestros.dominio.UbicacionReporte
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import java.io.File
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class UbicacionViewModelTest {
    @TempDir
    lateinit var directorio: File
    private val repositorio = mockk<RepositorioSiniestros>()
    private val polizas = mockk<RepositorioPolizas>()
    private val proveedor = ProveedorFalso()
    private var reglas = ReglasUbicacion(true, emptyList(), 100.0)
    private val fechaEvento = "2026-11-17T10:00:00-05:00"
    private var detalle = BorradorDetalle(
        "borrador", "poliza", "Choque", "ABIERTO", fechaEvento, 1, 0,
        listOf(Evidencia("foto", "foto.jpg", TipoEvidencia.FOTOGRAFIA, "image/jpeg", 10, EstadoCarga.CARGADA, fechaEvento, null)),
        "DANOS", fechaEvento,
    )
    private val envio = EnvioSiniestro("borrador", "reporte", "88-2026-1000", "REPORTADO", "2026-11-18T21:00:00Z")

    @BeforeEach
    fun preparar() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        coEvery { repositorio.limites() } answers {
            Resultado.Exito(LimitesSiniestros(5, listOf("image/jpeg"), listOf("video/mp4"), 1024, 1024, 60, 300, reglas))
        }
        coEvery { repositorio.listar() } returns Resultado.Exito(emptyList())
        coEvery { repositorio.historial(any()) } returns Resultado.Exito(PaginaSiniestros(emptyList(), null))
        coEvery { polizas.listar() } returns ResultadoPoliza.Exito(emptyList())
        val poliza = mockk<PolizaDetalle>()
        every { poliza.coberturas } returns listOf(Cobertura("DANOS", "Daños", false))
        every { poliza.vigencia } returns Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"))
        coEvery { polizas.detalle("poliza") } returns ResultadoPoliza.Exito(poliza)
        coEvery { repositorio.detalle("borrador") } answers { Resultado.Exito(detalle) }
        coEvery { repositorio.actualizar("borrador", any(), any(), any()) } answers { Resultado.Exito(detalle) }
        coEvery { repositorio.guardarDatos("borrador", any(), any(), any()) } answers { Resultado.Exito(detalle) }
        coEvery { repositorio.guardarUbicacion("borrador", any()) } answers {
            val lectura = secondArg<UbicacionCapturada>()
            val precision = lectura.precisionM
            val estado = when {
                precision == null -> EstadoUbicacion.NO_DISPONIBLE
                precision <= reglas.precisionMaxM -> EstadoUbicacion.DISPONIBLE
                else -> EstadoUbicacion.NO_CONFIABLE
            }
            detalle = detalle.copy(ubicacion = UbicacionReporte(lectura, estado))
            Resultado.Exito(detalle)
        }
        coEvery { repositorio.enviar("borrador", any()) } returns Resultado.Exito(envio)
    }

    @AfterEach
    fun limpiar() = Dispatchers.resetMain()

    private fun abrir(): SiniestrosViewModel = SiniestrosViewModel(
        repositorio, polizas, mockk<AlmacenEvidencias>(relaxed = true), mockk<GestorSesion>(relaxed = true),
        ahora = { OffsetDateTime.parse("2026-11-18T16:00:00-05:00") }, proveedorUbicacion = proveedor,
        almacenPendientes = AlmacenPendientesFalso(),
    ).also {
        it.consultarDetalle("borrador")
        assertTrue(it.prepararAdjuntarEvidencia("borrador"))
    }

    @Test
    fun `umbral inclusivo configurable y excepciones se aplican al codigo de causa`() = runTest {
        for ((precision, confiable) in listOf(99.99 to true, 100.0 to true, 100.01 to false)) {
            proveedor.lectura = proveedor.lectura.copy(precisionM = precision)
            val vm = abrir()
            vm.capturarUbicacion()
            assertEquals(confiable, vm.uiState.value.puedeEnviarPorUbicacion())
            assertEquals(precision, vm.uiState.value.ubicacion?.lectura?.precisionM)
        }
        reglas = ReglasUbicacion(true, emptyList(), 20.0)
        proveedor.lectura = proveedor.lectura.copy(precisionM = 25.0)
        val vm = abrir()
        vm.capturarUbicacion()
        assertFalse(vm.uiState.value.puedeEnviarPorUbicacion())
        reglas = reglas.copy(tiposOpcionales = listOf("DANOS"))
        vm.reintentarCarga()
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
        reglas = reglas.copy(tiposOpcionales = listOf("Daños"))
        vm.reintentarCarga()
        assertFalse(vm.uiState.value.puedeEnviarPorUbicacion())
    }

    @Test
    fun `denegado conserva borrador bloquea obligatoria y permite causa opcional sin coordenadas`() = runTest {
        proveedor.permiso = PermisoUbicacion.DENEGADO
        proveedor.lectura = UbicacionCapturada(proveedor.permiso)
        val vm = abrir()
        vm.capturarUbicacion()
        vm.reportar()
        assertEquals("borrador", vm.uiState.value.borradorActualId)
        assertFalse(vm.uiState.value.puedeEnviarPorUbicacion())
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
        coVerify { repositorio.guardarUbicacion("borrador", UbicacionCapturada(PermisoUbicacion.DENEGADO)) }
        reglas = reglas.copy(tiposOpcionales = listOf("DANOS"))
        vm.reintentarCarga()
        vm.reportar()
        assertEquals(envio, vm.uiState.value.envioConfirmado)
    }

    @Test
    fun `poliza mixta recalcula regla al cambiar amparo sin recrear borrador`() = runTest {
        reglas = ReglasUbicacion(true, listOf("AUXILIO_FUNERARIO", "ENFERMEDADES_GRAVES"), 100.0)
        proveedor.permiso = PermisoUbicacion.DENEGADO
        proveedor.lectura = UbicacionCapturada(proveedor.permiso)
        detalle = detalle.copy(causa = "AUXILIO_FUNERARIO")
        val poliza = mockk<PolizaDetalle>()
        every { poliza.coberturas } returns listOf(
            Cobertura("AUXILIO_FUNERARIO", "Auxilio funerario", true),
            Cobertura("ENFERMEDADES_GRAVES", "Enfermedades graves", true),
            Cobertura("MUERTE", "Muerte", false),
        )
        every { poliza.vigencia } returns Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"))
        coEvery { polizas.detalle("poliza") } returns ResultadoPoliza.Exito(poliza)
        coEvery { repositorio.actualizar("borrador", any(), any(), any()) } answers {
            detalle = detalle.copy(causa = arg(2))
            Resultado.Exito(detalle)
        }
        val vm = abrir()
        vm.capturarUbicacion()
        assertEquals(EstadoUbicacion.NO_DISPONIBLE, vm.uiState.value.ubicacion?.estado)
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
        vm.seleccionarCausa("MUERTE")
        assertFalse(vm.uiState.value.puedeEnviarPorUbicacion())
        vm.reportar()
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
        assertEquals("borrador", vm.uiState.value.borradorActualId)
        vm.seleccionarCausa("ENFERMEDADES_GRAVES")
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
        vm.reportar()
        assertEquals(envio, vm.uiState.value.envioConfirmado)
        coVerify { repositorio.actualizar("borrador", any(), "ENFERMEDADES_GRAVES", any()) }
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
        coVerify(exactly = 0) { repositorio.agregarEvidencia(any(), any(), any()) }
    }

    @Test
    fun `permiso denegado permanentemente permite envio opcional sin coordenadas`() = runTest {
        reglas = reglas.copy(tiposOpcionales = listOf("DANOS"))
        proveedor.permiso = PermisoUbicacion.DENEGADO_PERMANENTEMENTE
        proveedor.lectura = UbicacionCapturada(proveedor.permiso)
        val vm = abrir()
        vm.capturarUbicacion()
        assertEquals(EstadoUbicacion.NO_DISPONIBLE, vm.uiState.value.ubicacion?.estado)
        assertNull(vm.uiState.value.ubicacion?.lectura?.lat)
        assertNull(vm.uiState.value.ubicacion?.lectura?.lon)
        vm.reportar()
        assertEquals(envio, vm.uiState.value.envioConfirmado)
        coVerify { repositorio.guardarUbicacion("borrador", UbicacionCapturada(PermisoUbicacion.DENEGADO_PERMANENTEMENTE)) }
    }

    @Test
    fun `opcional permite envio con lectura imprecisa o sin lectura y conserva estado confirmado`() = runTest {
        reglas = reglas.copy(tiposOpcionales = listOf("DANOS"))
        for ((lectura, esperado) in listOf(
            proveedor.lectura.copy(precisionM = 100.01) to EstadoUbicacion.NO_CONFIABLE,
            UbicacionCapturada(PermisoUbicacion.PRECISO) to EstadoUbicacion.NO_DISPONIBLE,
        )) {
            detalle = detalle.copy(ubicacion = null)
            proveedor.lectura = lectura
            val vm = abrir()
            vm.capturarUbicacion()
            assertEquals(esperado, vm.uiState.value.ubicacion?.estado)
            assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
            vm.reportar()
            assertEquals(envio, vm.uiState.value.envioConfirmado)
            assertEquals(lectura, detalle.ubicacion?.lectura)
        }
    }

    @Test
    fun `ubicacion opcional no permite enviar evidencia pendiente`() = runTest {
        reglas = reglas.copy(tiposOpcionales = listOf("DANOS"))
        detalle = detalle.copy(
            evidenciasPendientes = 1,
            evidencias = detalle.evidencias.map { it.copy(estadoCarga = EstadoCarga.PENDIENTE) },
        )
        val vm = abrir()
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
        vm.reportar()
        assertEquals(FalloSiniestros.EvidenciaNoCargada, vm.uiState.value.falloFormulario)
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
    }

    @Test
    fun `lectura aproximada conserva permiso y no reemplaza fecha del evento`() = runTest {
        proveedor.permiso = PermisoUbicacion.APROXIMADO
        proveedor.lectura = proveedor.lectura.copy(permiso = proveedor.permiso, precisionM = 99.99)
        val vm = abrir()
        vm.capturarUbicacion()
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
        assertEquals(PermisoUbicacion.APROXIMADO, vm.uiState.value.ubicacion?.lectura?.permiso)
        assertEquals(fechaEvento, vm.uiState.value.fechaEvento)
        assertEquals("2026-11-18T20:00:00Z", vm.uiState.value.ubicacion?.lectura?.capturadaEn)
    }

    @Test
    fun `fallo PATCH mantiene lectura pendiente y reintenta el mismo borrador`() = runTest {
        coEvery { repositorio.guardarUbicacion("borrador", any()) } returnsMany listOf(
            Resultado.Fallo(FalloSiniestros.SinConexion),
            Resultado.Exito(detalle.copy(ubicacion = UbicacionReporte(proveedor.lectura, EstadoUbicacion.DISPONIBLE))),
        )
        val vm = abrir()
        vm.capturarUbicacion()
        assertNull(vm.uiState.value.ubicacion)
        assertEquals(proveedor.lectura, vm.uiState.value.ubicacionPendiente)
        assertFalse(vm.uiState.value.puedeEnviarPorUbicacion())
        vm.reintentarGuardarUbicacion()
        assertNull(vm.uiState.value.ubicacionPendiente)
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
        assertEquals("borrador", vm.uiState.value.borradorActualId)
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }

    @Test
    fun `revocar permiso borra lectura guardada y nunca reutiliza coordenadas`() = runTest {
        detalle = detalle.copy(ubicacion = UbicacionReporte(proveedor.lectura, EstadoUbicacion.DISPONIBLE))
        val vm = abrir()
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
        proveedor.permiso = PermisoUbicacion.DENEGADO_PERMANENTEMENTE
        vm.comprobarPermisoUbicacion()
        assertEquals(UbicacionCapturada(proveedor.permiso), vm.uiState.value.ubicacion?.lectura)
        assertFalse(vm.uiState.value.puedeEnviarPorUbicacion())
        coVerify { repositorio.guardarUbicacion("borrador", UbicacionCapturada(PermisoUbicacion.DENEGADO_PERMANENTEMENTE)) }
    }

    @Test
    fun `sin lectura se guarda no disponible y datos anteriores null no inventan permiso`() = runTest {
        val vm = abrir()
        assertNull(vm.uiState.value.ubicacion)
        assertNull(vm.uiState.value.ubicacionPendiente)
        proveedor.lectura = UbicacionCapturada(PermisoUbicacion.PRECISO)
        vm.capturarUbicacion()
        assertEquals(EstadoUbicacion.NO_DISPONIBLE, vm.uiState.value.ubicacion?.estado)
        vm.guardarBorrador()
        assertTrue(vm.uiState.value.borradorGuardado)
        assertEquals("borrador", vm.uiState.value.borradorActualId)
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
    }

    @Test
    fun `fallo al guardar ubicacion no impide conservar evidencias ni borra lectura pendiente`() = runTest {
        coEvery { repositorio.guardarUbicacion("borrador", any()) } returns Resultado.Fallo(FalloSiniestros.SinConexion)
        coEvery { repositorio.agregarEvidencia("borrador", any(), any()) } returns Resultado.Exito(detalle.evidencias.single())
        val vm = abrir()
        val archivo = File(directorio, "sintetica.jpg").apply { writeBytes(byteArrayOf(1, 2, 3)) }
        vm.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
        vm.capturarUbicacion()
        vm.guardarBorrador()
        coVerify(exactly = 1) { repositorio.agregarEvidencia("borrador", any(), any()) }
        assertTrue(vm.uiState.value.evidencias.isEmpty())
        assertEquals(proveedor.lectura, vm.uiState.value.ubicacionPendiente)
        assertEquals(FalloSiniestros.SinConexion, vm.uiState.value.falloUbicacion)
        assertFalse(vm.uiState.value.borradorGuardado)
        assertFalse(vm.uiState.value.enviando)
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
    }

    @Test
    fun `422 permite corregir y enviar sin cambiar borrador clave ni volver a cargar evidencia`() = runTest {
        coEvery { repositorio.enviar("borrador", any()) } returnsMany listOf(
            Resultado.Fallo(FalloSiniestros.UbicacionInvalida), Resultado.Exito(envio),
        )
        val vm = abrir()
        vm.capturarUbicacion()
        vm.reportar()
        assertEquals(FalloSiniestros.UbicacionInvalida, vm.uiState.value.falloUbicacion)
        assertEquals("borrador", vm.uiState.value.borradorActualId)
        vm.capturarUbicacion()
        vm.reportar()
        assertEquals(envio, vm.uiState.value.envioConfirmado)
        val claves = mutableListOf<String>()
        coVerify(exactly = 2) { repositorio.enviar("borrador", capture(claves)) }
        assertEquals(1, claves.distinct().size)
        coVerify(exactly = 0) { repositorio.agregarEvidencia(any(), any(), any()) }
    }

    @Test
    fun `sin reglas bloquea envio pero permite conservar borrador`() = runTest {
        coEvery { repositorio.limites() } returns Resultado.Exito(
            LimitesSiniestros(5, listOf("image/jpeg"), listOf("video/mp4"), 1024, 1024, 60, 300),
        )
        val vm = abrir()
        vm.guardarBorrador()
        assertTrue(vm.uiState.value.borradorGuardado)
        vm.reportar()
        assertFalse(vm.uiState.value.puedeEnviarPorUbicacion())
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
    }

    @Test
    fun `confirmacion previa se recupera incluso sin ubicacion obligatoria`() = runTest {
        val vm = abrir()
        detalle = detalle.copy(estado = "CONVERTIDO", envio = envio)
        vm.reportar()
        assertEquals(envio, vm.uiState.value.envioConfirmado)
        coVerify(exactly = 0) { repositorio.actualizar(any(), any(), any(), any()) }
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
    }

    @Test
    fun `salir de primer plano cancela proveedor sin guardar lectura ni bloquear reintento`() = runTest {
        proveedor.esperar = true
        val vm = abrir()
        vm.capturarUbicacion()
        assertTrue(vm.uiState.value.obteniendoUbicacion)
        vm.cancelarCapturaUbicacion()
        assertFalse(vm.uiState.value.obteniendoUbicacion)
        coVerify(exactly = 0) { repositorio.guardarUbicacion(any(), any()) }
        proveedor.esperar = false
        vm.capturarUbicacion()
        assertTrue(vm.uiState.value.puedeEnviarPorUbicacion())
    }

    @Test
    fun `lecturas incompletas sin permiso o fuera de rango nunca se envian`() = runTest {
        val valida = proveedor.lectura
        val invalidas = listOf(
            valida.copy(lat = null), valida.copy(lon = null), valida.copy(precisionM = null),
            valida.copy(capturadaEn = null), valida.copy(lat = -90.01), valida.copy(lat = 90.01),
            valida.copy(lon = -180.01), valida.copy(lon = 180.01),
            valida.copy(lat = Double.NaN), valida.copy(lon = Double.POSITIVE_INFINITY),
            valida.copy(precisionM = Double.NaN), valida.copy(precisionM = Double.POSITIVE_INFINITY),
            valida.copy(precisionM = 0.0), valida.copy(precisionM = -1.0),
            valida.copy(capturadaEn = "2026-11-18T20:00:00"),
        ) + listOf(PermisoUbicacion.DENEGADO, PermisoUbicacion.DENEGADO_PERMANENTEMENTE, PermisoUbicacion.NO_SOLICITADO)
            .map { valida.copy(permiso = it) }
        invalidas.forEach { assertFalse(it.esValida()) }
        assertTrue(valida.copy(lat = -90.0, lon = -180.0).esValida())
        assertTrue(valida.copy(lat = 90.0, lon = 180.0).esValida())
        PermisoUbicacion.entries.forEach { assertTrue(UbicacionCapturada(it).esValida()) }
        proveedor.lectura = valida.copy(precisionM = Double.NaN)
        val vm = abrir()
        vm.capturarUbicacion()
        assertEquals(FalloSiniestros.UbicacionInvalida, vm.uiState.value.falloUbicacion)
        coVerify(exactly = 0) { repositorio.guardarUbicacion(any(), any()) }
    }

    private class ProveedorFalso : ProveedorUbicacion {
        var esperar = false
        var permiso = PermisoUbicacion.PRECISO
        var lectura = UbicacionCapturada(permiso, 4.6, -74.0, 35.5, "2026-11-18T20:00:00Z")
        override fun permisoActual() = permiso
        override fun registrarRespuesta(permanente: Boolean) = Unit
        override suspend fun capturar(): CapturaUbicacion {
            if (esperar) awaitCancellation()
            return CapturaUbicacion(lectura)
        }
    }
}
