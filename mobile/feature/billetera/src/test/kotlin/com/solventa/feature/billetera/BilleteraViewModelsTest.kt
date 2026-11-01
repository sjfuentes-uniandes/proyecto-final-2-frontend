package com.solventa.feature.billetera

import app.cash.turbine.test
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.casos.ConsultarPoliza
import com.solventa.feature.billetera.casos.ListarPolizas
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.Credencial
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Resultado
import com.solventa.feature.billetera.dominio.Vigencia
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.lang.reflect.Modifier
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertSame
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class BilleteraViewModelsTest {
    private val despachador = StandardTestDispatcher()
    private val repositorio = mockk<RepositorioPolizas>()
    private val gestorSesion = mockk<GestorSesion>(relaxed = true)

    private val vigencia = Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"))
    private val resumen = PolizaResumen(
        polizaId = "id-1",
        numero = "POL-001",
        estado = "ACTIVA",
        producto = "Vida",
        ramo = "Personas",
        vigencia = vigencia,
        vigente = true,
        resumenCobertura = ResumenCobertura(BigDecimal("300000000"), "COP", 2),
    )
    private val detalle = PolizaDetalle(
        numero = "POL-001",
        estado = "ACTIVA",
        producto = "Vida",
        ramo = "Personas",
        vigencia = vigencia,
        vigente = true,
        prima = BigDecimal("1200000"),
        sumaAsegurada = BigDecimal("300000000"),
        moneda = "COP",
        periodicidad = "MENSUAL",
        emitidaEn = OffsetDateTime.parse("2026-01-01T10:00:00Z"),
        coberturas = listOf(Cobertura("MUERTE", "Muerte", true)),
        credencial = Credencial("CRED-123", "0123456789abcdef", "firma-1", vigencia),
    )

    @BeforeEach
    fun preparar() {
        Dispatchers.setMain(despachador)
    }

    @AfterEach
    fun limpiar() {
        Dispatchers.resetMain()
    }

    private fun lista() = BilleteraViewModel(ListarPolizas(repositorio), gestorSesion)

    private fun detalleVm() = DetallePolizaViewModel("id-1", ConsultarPoliza(repositorio), gestorSesion)

    // ---- Lista ----

    @Test
    fun `lista - Cargando y luego Contenido`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(resumen))
        val vm = lista()

        vm.uiState.test {
            assertEquals(BilleteraUiState.Cargando, awaitItem())
            advanceUntilIdle()
            assertEquals(BilleteraUiState.Contenido(listOf(resumen)), awaitItem())
        }
    }

    @Test
    fun `lista - sin polizas pasa a Vacia`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Exito(emptyList())
        val vm = lista()
        advanceUntilIdle()

        assertEquals(BilleteraUiState.Vacia, vm.uiState.value)
    }

    @Test
    fun `lista - sin conexion y reintento exitoso`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloPolizas.SinConexion) andThen
            Resultado.Exito(listOf(resumen))
        val vm = lista()
        advanceUntilIdle()
        assertEquals(BilleteraUiState.SinConexion, vm.uiState.value)

        vm.reintentar()
        assertEquals(BilleteraUiState.Cargando, vm.uiState.value)
        advanceUntilIdle()

        assertEquals(BilleteraUiState.Contenido(listOf(resumen)), vm.uiState.value)
        coVerify(exactly = 2) { repositorio.listar() }
    }

    @Test
    fun `lista - cada fallo reintentable o generico pasa a Error`() = runTest {
        listOf(
            FalloPolizas.ServicioNoDisponible,
            FalloPolizas.ErrorGenerico,
            FalloPolizas.NoAutorizada,
            FalloPolizas.NoEncontrada,
        ).forEach { fallo ->
            coEvery { repositorio.listar() } returns Resultado.Fallo(fallo)
            val vm = lista()
            advanceUntilIdle()
            assertEquals(BilleteraUiState.Error, vm.uiState.value, "fallo=$fallo")
        }
    }

    @Test
    fun `lista - Error y reintento que vuelve a fallar queda en Error`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloPolizas.ServicioNoDisponible)
        val vm = lista()
        advanceUntilIdle()

        vm.reintentar()
        advanceUntilIdle()

        assertEquals(BilleteraUiState.Error, vm.uiState.value)
        coVerify(exactly = 2) { repositorio.listar() }
    }

    @Test
    fun `lista - sesion invalida cierra sesion y navega al login`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloPolizas.SesionInvalida)
        val vm = lista()

        vm.eventos.test {
            advanceUntilIdle()
            assertEquals(EventoBilletera.IrALogin, awaitItem())
        }
        verify(exactly = 1) { gestorSesion.cerrarSesion() }
        // No se expone ningún estado con datos ni de error.
        assertEquals(BilleteraUiState.Cargando, vm.uiState.value)
    }

    @Test
    fun `lista - IrALogin emitido antes de recolectar no se pierde`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloPolizas.SesionInvalida)
        val vm = lista()
        advanceUntilIdle()

        vm.eventos.test {
            assertEquals(EventoBilletera.IrALogin, awaitItem())
            expectNoEvents()
        }
    }

    @Test
    fun `detalle - IrALogin emitido antes de recolectar no se pierde`() = runTest {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.SesionInvalida)
        val vm = detalleVm()
        advanceUntilIdle()

        vm.eventos.test {
            assertEquals(EventoBilletera.IrALogin, awaitItem())
            expectNoEvents()
        }
    }

    @Test
    fun `lista - reintentar con una carga en curso se ignora`() = runTest {
        val compuerta = CompletableDeferred<Unit>()
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloPolizas.SinConexion) coAndThen {
            compuerta.await()
            Resultado.Exito(listOf(resumen))
        }
        val vm = lista()
        advanceUntilIdle()

        vm.reintentar()
        runCurrent()
        vm.reintentar()
        compuerta.complete(Unit)
        advanceUntilIdle()

        coVerify(exactly = 2) { repositorio.listar() }
        assertEquals(BilleteraUiState.Contenido(listOf(resumen)), vm.uiState.value)
    }

    // ---- Detalle ----

    @Test
    fun `detalle - Cargando y luego Contenido con el id de navegacion`() = runTest {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Exito(detalle)
        val vm = detalleVm()

        vm.uiState.test {
            assertEquals(DetallePolizaUiState.Cargando, awaitItem())
            advanceUntilIdle()
            assertEquals(DetallePolizaUiState.Contenido(detalle), awaitItem())
        }
        coVerify(exactly = 1) { repositorio.detalle("id-1") }
    }

    @Test
    fun `detalle - sin conexion y reintento exitoso`() = runTest {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.SinConexion) andThen
            Resultado.Exito(detalle)
        val vm = detalleVm()
        advanceUntilIdle()
        assertEquals(DetallePolizaUiState.SinConexion, vm.uiState.value)

        vm.reintentar()
        assertEquals(DetallePolizaUiState.Cargando, vm.uiState.value)
        advanceUntilIdle()

        assertEquals(DetallePolizaUiState.Contenido(detalle), vm.uiState.value)
    }

    @Test
    fun `detalle - servicio no disponible y error generico pasan a Error con reintento`() = runTest {
        listOf(FalloPolizas.ServicioNoDisponible, FalloPolizas.ErrorGenerico).forEach { fallo ->
            coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(fallo) andThen Resultado.Exito(detalle)
            val vm = detalleVm()
            advanceUntilIdle()
            assertEquals(DetallePolizaUiState.Error, vm.uiState.value, "fallo=$fallo")

            vm.reintentar()
            advanceUntilIdle()
            assertEquals(DetallePolizaUiState.Contenido(detalle), vm.uiState.value)
        }
    }

    @Test
    fun `detalle - poliza ajena pasa a NoAutorizada sin ningun dato`() = runTest {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.NoAutorizada)
        val vm = detalleVm()
        advanceUntilIdle()

        val estado = vm.uiState.value
        assertSame(DetallePolizaUiState.NoAutorizada, estado)
        val campos = DetallePolizaUiState.NoAutorizada::class.java.declaredFields
            .filterNot { Modifier.isStatic(it.modifiers) }
        assertTrue(campos.isEmpty(), "NoAutorizada no debe guardar datos")
        listOf("POL-001", "CRED-123", "0123456789abcdef", "firma-1", "Vida").forEach {
            assertFalse(estado.toString().contains(it))
        }
        verify(exactly = 0) { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `detalle - poliza inexistente pasa a NoEncontrada`() = runTest {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.NoEncontrada)
        val vm = detalleVm()
        advanceUntilIdle()

        assertEquals(DetallePolizaUiState.NoEncontrada, vm.uiState.value)
    }

    @Test
    fun `detalle - sesion invalida cierra sesion y navega al login`() = runTest {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.SesionInvalida)
        val vm = detalleVm()

        vm.eventos.test {
            advanceUntilIdle()
            assertEquals(EventoBilletera.IrALogin, awaitItem())
        }
        verify(exactly = 1) { gestorSesion.cerrarSesion() }
        assertEquals(DetallePolizaUiState.Cargando, vm.uiState.value)
    }

    @Test
    fun `detalle - reintentar con una carga en curso se ignora`() = runTest {
        val compuerta = CompletableDeferred<Unit>()
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.SinConexion) coAndThen {
            compuerta.await()
            Resultado.Exito(detalle)
        }
        val vm = detalleVm()
        advanceUntilIdle()

        vm.reintentar()
        runCurrent()
        vm.reintentar()
        compuerta.complete(Unit)
        advanceUntilIdle()

        coVerify(exactly = 2) { repositorio.detalle("id-1") }
        assertEquals(DetallePolizaUiState.Contenido(detalle), vm.uiState.value)
    }

    // ---- Fábricas ----

    @Test
    fun `las fabricas crean los ViewModels con el id de navegacion`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Exito(emptyList())
        coEvery { repositorio.detalle("id-9") } returns Resultado.Exito(detalle)

        val vmLista = BilleteraViewModelFactory(repositorio, gestorSesion).create(BilleteraViewModel::class.java)
        val vmDetalle = DetallePolizaViewModelFactory("id-9", repositorio, gestorSesion)
            .create(DetallePolizaViewModel::class.java)
        advanceUntilIdle()

        assertEquals(BilleteraUiState.Vacia, vmLista.uiState.value)
        assertEquals(DetallePolizaUiState.Contenido(detalle), vmDetalle.uiState.value)
        coVerify(exactly = 1) { repositorio.detalle("id-9") }
    }
}
