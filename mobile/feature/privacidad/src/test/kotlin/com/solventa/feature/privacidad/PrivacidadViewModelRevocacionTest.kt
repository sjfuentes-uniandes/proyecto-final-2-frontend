package com.solventa.feature.privacidad

import app.cash.turbine.test
import com.solventa.feature.privacidad.casos.ListarConsentimientos
import com.solventa.feature.privacidad.casos.ObtenerTextoVigente
import com.solventa.feature.privacidad.casos.OtorgarConsentimiento
import com.solventa.feature.privacidad.casos.RevocarConsentimiento
import com.solventa.feature.privacidad.casos.VerDetalleConsentimiento
import com.solventa.feature.privacidad.casos.VerHistorialConsentimiento
import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Hito
import com.solventa.feature.privacidad.dominio.Otorgamiento
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.TipoHito
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertIs

/** Revocación e historial en el ViewModel (HU-M09). */
@OptIn(ExperimentalCoroutinesApi::class)
class PrivacidadViewModelRevocacionTest {
    private val despachador = StandardTestDispatcher()
    private val repositorio = mockk<RepositorioConsentimientos>()
    private val verificador = mockk<VerificadorBiometrico>()

    private val activo = Consentimiento(
        id = "c-1",
        estado = EstadoConsentimiento.ACTIVO,
        proposito = "PERFILAMIENTO_PRECIO",
        alcances = listOf("FA_PRODUCTOS_VIGENTES"),
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
        otorgadoEn = Instant.parse("2026-10-17T15:00:00Z"),
        vigenteHasta = Instant.parse("2027-10-17T23:59:59Z"),
        revocadoEn = null,
    )
    private val revocado = activo.copy(estado = EstadoConsentimiento.REVOCADO, revocadoEn = Instant.parse("2026-11-02T08:15:00Z"))
    private val historial = Historial(
        "c-1",
        EstadoConsentimiento.REVOCADO,
        listOf(Hito(TipoHito.OTORGADO, activo.otorgadoEn), Hito(TipoHito.REVOCADO, revocado.revocadoEn!!)),
    )

    @BeforeEach
    fun preparar() {
        Dispatchers.setMain(despachador)
        coEvery { verificador.confirmar(any()) } returns ConfirmacionBiometrica.CONFIRMADA
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(revocado))
        coEvery { repositorio.historial("c-1") } returns Resultado.Exito(historial)
    }

    @AfterEach
    fun terminar() {
        Dispatchers.resetMain()
    }

    private fun viewModel() = PrivacidadViewModel(
        ListarConsentimientos(repositorio),
        VerDetalleConsentimiento(repositorio),
        ObtenerTextoVigente(repositorio),
        OtorgarConsentimiento(repositorio, verificador),
        RevocarConsentimiento(repositorio, verificador),
        VerHistorialConsentimiento(repositorio),
    )

    @Test
    fun `revocar pasa por en curso y deja el detalle, la lista y el historial actualizados (AC1)`() = runTest {
        coEvery { repositorio.revocar("c-1") } returns Resultado.Exito(revocado)
        val vm = viewModel()

        vm.uiState.test {
            assertEquals(EstadoRevocacion.Inactivo, awaitItem().revocacion)
            vm.revocar("c-1")
            assertEquals(EstadoRevocacion.EnCurso, awaitItem().revocacion)
            cancelAndIgnoreRemainingEvents()
        }
        advanceUntilIdle()

        val estado = vm.uiState.value
        assertEquals(EstadoRevocacion.Resuelto(revocado), estado.revocacion)
        assertEquals(Carga.Lista(revocado), estado.detalle)
        assertEquals(Carga.Lista(listOf(revocado)), estado.consentimientos)
        assertEquals(Carga.Lista(historial), estado.historial)
    }

    @Test
    fun `un VENCIDO se conserva tal como lo devuelve el servidor`() = runTest {
        val vencido = activo.copy(estado = EstadoConsentimiento.VENCIDO)
        coEvery { repositorio.revocar("c-1") } returns Resultado.Exito(vencido)
        val vm = viewModel()

        vm.revocar("c-1")
        advanceUntilIdle()

        assertEquals(EstadoRevocacion.Resuelto(vencido), vm.uiState.value.revocacion)
    }

    @Test
    fun `revocar tras otorgar deja de mostrar el otorgamiento`() = runTest {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(activo, repeticion = false))
        coEvery { repositorio.revocar("c-1") } returns Resultado.Exito(revocado)
        val vm = viewModel()
        vm.otorgar(
            SolicitudOtorgamiento(
                Permiso.OPEN_FINANCE_OPEN_DATA,
                setOf(Alcance.FA_PRODUCTOS_VIGENTES),
                12,
                "2026-10-17.1",
                "es-CO",
            ),
        )
        advanceUntilIdle()

        vm.revocar("c-1")
        advanceUntilIdle()

        assertEquals(EstadoOtorgamiento.Inactivo, vm.uiState.value.otorgamiento)
        assertEquals(Carga.Lista(revocado), vm.uiState.value.detalle)
    }

    @Test
    fun `un toque repetido mientras va en curso no revoca dos veces`() = runTest {
        coEvery { repositorio.revocar("c-1") } returns Resultado.Exito(revocado)
        val vm = viewModel()

        vm.revocar("c-1")
        vm.revocar("c-1")
        advanceUntilIdle()

        coVerify(exactly = 1) { repositorio.revocar("c-1") }
    }

    @Test
    fun `un fallo reintentable se puede reintentar con la misma peticion (idempotente)`() = runTest {
        coEvery { repositorio.revocar("c-1") } returnsMany listOf(
            Resultado.Fallo(FalloConsentimiento.ServicioNoDisponible),
            Resultado.Exito(revocado),
        )
        val vm = viewModel()

        vm.revocar("c-1")
        advanceUntilIdle()
        assertEquals(EstadoRevocacion.Fallido(FalloConsentimiento.ServicioNoDisponible), vm.uiState.value.revocacion)

        vm.reintentarRevocacion()
        advanceUntilIdle()

        assertEquals(EstadoRevocacion.Resuelto(revocado), vm.uiState.value.revocacion)
        coVerify(exactly = 2) { repositorio.revocar("c-1") }
    }

    @Test
    fun `tras un fallo definitivo reintentar no hace nada`() = runTest {
        coEvery { repositorio.revocar("ajeno") } returns Resultado.Fallo(FalloConsentimiento.NoEncontrado)
        val vm = viewModel()

        vm.revocar("ajeno")
        advanceUntilIdle()
        vm.reintentarRevocacion()
        advanceUntilIdle()

        assertEquals(EstadoRevocacion.Fallido(FalloConsentimiento.NoEncontrado), vm.uiState.value.revocacion)
        coVerify(exactly = 1) { repositorio.revocar("ajeno") }
    }

    @Test
    fun `sin una revocacion pendiente reintentar no hace nada`() = runTest {
        val vm = viewModel()

        vm.reintentarRevocacion()
        advanceUntilIdle()

        coVerify(exactly = 0) { repositorio.revocar(any()) }
        assertEquals(EstadoRevocacion.Inactivo, vm.uiState.value.revocacion)
    }

    @Test
    fun `la biometria cancelada no llama al servidor y se puede volver a intentar`() = runTest {
        coEvery { verificador.confirmar(any()) } returnsMany listOf(ConfirmacionBiometrica.CANCELADA, ConfirmacionBiometrica.CONFIRMADA)
        coEvery { repositorio.revocar("c-1") } returns Resultado.Exito(revocado)
        val vm = viewModel()

        vm.revocar("c-1")
        advanceUntilIdle()
        val fallo = (vm.uiState.value.revocacion as EstadoRevocacion.Fallido).fallo
        assertEquals(FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.CANCELADA), fallo)
        coVerify(exactly = 0) { repositorio.revocar(any()) }

        vm.reintentarRevocacion()
        advanceUntilIdle()
        assertIs<EstadoRevocacion.Resuelto>(vm.uiState.value.revocacion)
    }

    @Test
    fun `descartar cierra el resultado`() = runTest {
        coEvery { repositorio.revocar("c-1") } returns Resultado.Fallo(FalloConsentimiento.SinConexion)
        val vm = viewModel()
        vm.revocar("c-1")
        advanceUntilIdle()

        vm.descartarRevocacion()

        assertEquals(EstadoRevocacion.Inactivo, vm.uiState.value.revocacion)
    }

    @Test
    fun `cargar el historial pasa por cargando y termina en lista o error`() = runTest {
        coEvery { repositorio.historial("otro") } returns Resultado.Fallo(FalloConsentimiento.SinConexion)
        val vm = viewModel()

        vm.cargarHistorial("c-1")
        assertEquals(Carga.Cargando, vm.uiState.value.historial)
        advanceUntilIdle()
        assertEquals(Carga.Lista(historial), vm.uiState.value.historial)

        vm.cargarHistorial("otro")
        advanceUntilIdle()
        assertEquals(Carga.Error(FalloConsentimiento.SinConexion), vm.uiState.value.historial)
    }
}
