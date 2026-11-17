package com.solventa.feature.siniestros

import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Resultado as ResultadoPolizas
import com.solventa.feature.billetera.dominio.Vigencia
import com.solventa.feature.siniestros.dominio.Borrador
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.Evidencia
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import androidx.lifecycle.ViewModel
import app.cash.turbine.test
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import java.io.File
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SiniestrosViewModelTest {
    private val repositorio = mockk<RepositorioSiniestros>()
    private val repositorioPolizas = mockk<RepositorioPolizas>()
    private val almacen = mockk<com.solventa.feature.siniestros.dominio.AlmacenEvidencias>(relaxed = true)
    private val gestorSesion = mockk<GestorSesion>(relaxed = true)
    private val limites = LimitesSiniestros(
        maxEvidencias = 1,
        formatosFoto = listOf("image/jpeg", "image/png"),
        formatosVideo = listOf("video/mp4"),
        tamanoMaximoFotoBytes = 10,
        tamanoMaximoVideoBytes = 20,
        duracionMaximaVideoSegundos = 60,
        urlCargaExpiraSegundos = 300,
    )

    @BeforeEach
    fun configurarMain() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        coEvery { repositorio.limites() } returns Resultado.Exito(limites)
        coEvery { repositorio.listar() } returns Resultado.Exito(emptyList())
        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Exito(
            listOf(
                poliza("vigente", "EMITIDA", true),
                poliza("vencida", "EMITIDA", false),
                poliza("en-emision", "EN_EMISION", true),
            ),
        )
    }

    @AfterEach
    fun restaurarMain() {
        Dispatchers.resetMain()
    }

    @Test
    fun `solo permite seleccionar poliza emitida y vigente`() = runTest {
        val viewModel = crearViewModel()

        assertEquals(listOf("vigente"), viewModel.uiState.value.polizasElegibles.map { it.polizaId })
        viewModel.seleccionarPoliza("vencida")
        assertNull(viewModel.uiState.value.polizaSeleccionada)
        viewModel.seleccionarPoliza("vigente")
        assertEquals("vigente", viewModel.uiState.value.polizaSeleccionada)
    }

    @Test
    fun `error de polizas no invalida el flujo y sesion invalida emite login`() = runTest {
        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Fallo(FalloPolizas.ErrorGenerico)
        val viewModel = crearViewModel()
        assertTrue(viewModel.uiState.value.polizasElegibles.isEmpty())
        assertEquals(FalloSiniestros.RespuestaInvalida, viewModel.uiState.value.errorCarga)

        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Fallo(FalloPolizas.SesionInvalida)
        val viewModelConSesionVencida = crearViewModel()
        viewModelConSesionVencida.eventos.test {
            assertEquals(EventoSiniestros.IrALogin, awaitItem())
        }
        coVerify { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `rechaza evidencia que excede limites y elimina el archivo temporal`() = runTest {
        val viewModel = crearViewModel()
        val archivoExcedido = mockk<File>()
        every { archivoExcedido.isFile } returns true
        every { archivoExcedido.length() } returns 11

        viewModel.agregarCaptura(archivoExcedido, TipoEvidencia.FOTOGRAFIA)

        assertEquals(FalloSiniestros.TamanoEvidenciaExcedido, viewModel.uiState.value.falloFormulario)
        assertTrue(viewModel.uiState.value.evidencias.isEmpty())
        io.mockk.verify { almacen.eliminar(archivoExcedido) }
    }

    @Test
    fun `rechaza archivo ausente vacio tipo desconocido y video sin duracion o fuera del limite`() = runTest {
        val viewModel = crearViewModel()
        val ausente = mockk<File>()
        every { ausente.isFile } returns false
        viewModel.agregarCaptura(ausente, TipoEvidencia.FOTOGRAFIA)
        assertEquals(FalloSiniestros.ArchivoNoDisponible, viewModel.uiState.value.falloFormulario)

        val vacio = mockk<File>()
        every { vacio.isFile } returns true
        every { vacio.length() } returns 0
        viewModel.agregarCaptura(vacio, TipoEvidencia.FOTOGRAFIA)
        assertEquals(FalloSiniestros.ArchivoNoDisponible, viewModel.uiState.value.falloFormulario)

        val desconocido = mockk<File>()
        every { desconocido.isFile } returns true
        every { desconocido.length() } returns 1
        viewModel.agregarCaptura(desconocido, TipoEvidencia.DESCONOCIDO)
        assertEquals(FalloSiniestros.EvidenciaNoAdmitida, viewModel.uiState.value.falloFormulario)

        val video = mockk<File>()
        every { video.isFile } returns true
        every { video.length() } returns 1
        viewModel.agregarCaptura(video, TipoEvidencia.VIDEO)
        assertEquals(FalloSiniestros.EvidenciaNoAdmitida, viewModel.uiState.value.falloFormulario)
        viewModel.agregarCaptura(video, TipoEvidencia.VIDEO, 61)
        assertEquals(FalloSiniestros.DuracionVideoExcedida, viewModel.uiState.value.falloFormulario)

        listOf(ausente, vacio, desconocido, video).forEach {
            io.mockk.verify { almacen.eliminar(it) }
        }
    }

    @Test
    fun `agrega evidencia valida y al llegar al maximo elimina la siguiente temporal`() = runTest {
        val viewModel = crearViewModel()
        val valida = mockk<File>()
        every { valida.isFile } returns true
        every { valida.length() } returns 10
        val excedente = mockk<File>()

        viewModel.agregarCaptura(valida, TipoEvidencia.FOTOGRAFIA)
        viewModel.agregarCaptura(excedente, TipoEvidencia.FOTOGRAFIA)

        assertEquals(1, viewModel.uiState.value.evidencias.size)
        assertEquals(FalloSiniestros.LimiteEvidenciasAlcanzado, viewModel.uiState.value.falloFormulario)
        io.mockk.verify { almacen.eliminar(excedente) }
    }

    @Test
    fun `reutiliza la misma clave de idempotencia ante un reintento de red`() = runTest {
        coEvery {
            repositorio.crearBorrador("vigente", "Choque en la vía", any())
        } returnsMany listOf(
            Resultado.Fallo(FalloSiniestros.SinConexion),
            Resultado.Exito(Borrador("borrador-1", "vigente", "ABIERTO")),
        )
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("  Choque en la vía  ")

        viewModel.reportar()
        assertFalse(viewModel.uiState.value.enviando)
        assertEquals(FalloSiniestros.SinConexion, viewModel.uiState.value.falloFormulario)
        viewModel.reportar()

        viewModel.eventos.test {
            assertEquals(EventoSiniestros.AbrirDetalle("borrador-1"), awaitItem())
        }
        coVerify(exactly = 2) {
            repositorio.crearBorrador("vigente", "Choque en la vía", "clave-fija")
        }
    }

    @Test
    fun `reporte exitoso elimina temporales y publica el borrador creado`() = runTest {
        val archivo = mockk<File>()
        every { archivo.isFile } returns true
        every { archivo.length() } returns 10
        coEvery {
            repositorio.crearBorrador("vigente", "Choque", any())
        } returns Resultado.Exito(Borrador("borrador-2", "vigente", "ABIERTO"))
        coEvery { repositorio.agregarEvidencia("borrador-2", any(), limites) } returns
            Resultado.Exito(
            Evidencia(
                "evidencia-1",
                "foto.jpg",
                TipoEvidencia.FOTOGRAFIA,
                "image/jpeg",
                10,
                EstadoCarga.CARGADA,
                null,
                null,
            ),
            )
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")
        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)

        viewModel.eventos.test {
            viewModel.reportar()
            assertEquals(EventoSiniestros.AbrirDetalle("borrador-2"), awaitItem())
        }

        assertTrue(viewModel.uiState.value.evidencias.isEmpty())
        assertFalse(viewModel.uiState.value.enviando)
        io.mockk.verify { almacen.eliminar(archivo) }
    }

    @Test
    fun `reporte sin poliza o descripcion no llama al repositorio`() = runTest {
        val viewModel = crearViewModel()

        viewModel.reportar()
        assertEquals(FalloSiniestros.PolizaNoEncontrada, viewModel.uiState.value.falloFormulario)
        viewModel.seleccionarPoliza("vigente")
        viewModel.reportar()
        assertEquals(FalloSiniestros.DescripcionObligatoria, viewModel.uiState.value.falloFormulario)
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }

    @Test
    fun `sesion vencida al crear borrador cierra sesion y emite login`() = runTest {
        coEvery { repositorio.crearBorrador(any(), any(), any()) } returns
            Resultado.Fallo(FalloSiniestros.SesionVencida)
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")

        viewModel.eventos.test {
            viewModel.reportar()
            assertEquals(EventoSiniestros.IrALogin, awaitItem())
        }
        assertEquals(FalloSiniestros.SesionVencida, viewModel.uiState.value.falloFormulario)
        coVerify { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `detalle con sesion vencida cierra sesion y emite login`() = runTest {
        coEvery { repositorio.detalle("borrador-1") } returns Resultado.Fallo(FalloSiniestros.SesionVencida)
        val viewModel = crearViewModel()

        viewModel.eventos.test {
            viewModel.consultarDetalle("borrador-1")
            assertEquals(EventoSiniestros.IrALogin, awaitItem())
        }
        assertFalse(viewModel.uiState.value.cargandoDetalle)
        coVerify { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `limites no disponibles impiden agregar y reportar evidencia`() = runTest {
        coEvery { repositorio.limites() } returns Resultado.Fallo(FalloSiniestros.RespuestaInvalida)
        val viewModel = crearViewModel()
        val archivo = mockk<File>()

        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
        assertEquals(FalloSiniestros.RespuestaInvalida, viewModel.uiState.value.falloFormulario)
        io.mockk.verify { almacen.eliminar(archivo) }
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")
        viewModel.reportar()
        assertEquals(FalloSiniestros.RespuestaInvalida, viewModel.uiState.value.falloFormulario)
    }

    @Test
    fun `cancelar elimina temporales y limpia el formulario`() = runTest {
        val viewModel = crearViewModel()
        val archivo = mockk<File>()
        every { archivo.isFile } returns true
        every { archivo.length() } returns 2
        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")

        viewModel.cancelarFormulario()

        assertTrue(viewModel.uiState.value.evidencias.isEmpty())
        assertNull(viewModel.uiState.value.polizaSeleccionada)
        assertEquals("", viewModel.uiState.value.descripcion)
        io.mockk.verify { almacen.eliminar(archivo) }
    }

    @Test
    fun `factory crea el viewmodel esperado y rechaza tipos incompatibles`() {
        val factory = SiniestrosViewModelFactory(repositorio, repositorioPolizas, almacen, gestorSesion)

        assertTrue(factory.create(SiniestrosViewModel::class.java) is SiniestrosViewModel)
        assertThrows(IllegalArgumentException::class.java) {
            factory.create(OtroViewModel::class.java)
        }
    }

    private class OtroViewModel : ViewModel()

    private fun crearViewModel() = SiniestrosViewModel(
        repositorio = repositorio,
        repositorioPolizas = repositorioPolizas,
        almacen = almacen,
        gestorSesion = gestorSesion,
        nuevaClave = { "clave-fija" },
        ahora = { OffsetDateTime.parse("2026-11-16T22:10:02-05:00") },
    )

    private fun poliza(id: String, estado: String, vigente: Boolean) = PolizaResumen(
        polizaId = id,
        numero = id,
        estado = estado,
        producto = "Auto",
        ramo = "Vehículos",
        vigencia = Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31")),
        vigente = vigente,
        resumenCobertura = ResumenCobertura(java.math.BigDecimal.ZERO, "COP", 1),
    )
}
