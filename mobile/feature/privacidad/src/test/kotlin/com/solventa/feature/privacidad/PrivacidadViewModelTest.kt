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
import com.solventa.feature.privacidad.dominio.GeneradorClave
import com.solventa.feature.privacidad.dominio.Otorgamiento
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.TextoVigente
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
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class PrivacidadViewModelTest {
    private val despachador = StandardTestDispatcher()
    private val repositorio = mockk<RepositorioConsentimientos>()
    private val verificador = mockk<VerificadorBiometrico>()
    private var claves = 0
    private val generador = GeneradorClave { "clave-${++claves}" }

    private val consentimiento = Consentimiento(
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
    private val solicitud = SolicitudOtorgamiento(
        permiso = Permiso.OPEN_FINANCE_OPEN_DATA,
        alcances = setOf(Alcance.FA_PRODUCTOS_VIGENTES),
        vigenciaMeses = 12,
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
    )

    @BeforeEach
    fun preparar() {
        Dispatchers.setMain(despachador)
        coEvery { verificador.confirmar(any()) } returns ConfirmacionBiometrica.CONFIRMADA
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(consentimiento))
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
        generador,
    )

    private fun clavesEnviadas(): List<String> {
        val enviadas = mutableListOf<String>()
        coVerify { repositorio.otorgar(any(), capture(enviadas)) }
        return enviadas
    }

    // --- Estado inicial y lecturas --------------------------------------------------------------

    @Test
    fun `muestra los tres permisos y solo Open Finance se puede otorgar (ADR 0001)`() {
        val estado = viewModel().uiState.value

        assertEquals(Permiso.entries, estado.permisos)
        assertTrue(estado.puedeOtorgar(Permiso.OPEN_FINANCE_OPEN_DATA))
        assertFalse(estado.puedeOtorgar(Permiso.DATOS_PERSONALES_FINANCIEROS))
        assertFalse(estado.puedeOtorgar(Permiso.BIOMETRICOS_IDENTIDAD))
        assertEquals(Carga.Inactiva, estado.consentimientos)
        assertEquals(EstadoOtorgamiento.Inactivo, estado.otorgamiento)
    }

    @Test
    fun `cargar la lista pasa por Cargando y termina con los consentimientos`() = runTest(despachador) {
        val vm = viewModel()
        vm.uiState.test {
            skipItems(1)
            vm.cargarConsentimientos()
            assertEquals(Carga.Cargando, awaitItem().consentimientos)
            assertEquals(Carga.Lista(listOf(consentimiento)), awaitItem().consentimientos)
        }
    }

    @Test
    fun `un fallo al cargar la lista queda como Error con su motivo`() = runTest(despachador) {
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloConsentimiento.SinConexion)
        val vm = viewModel()

        vm.cargarConsentimientos()
        advanceUntilIdle()

        assertEquals(Carga.Error(FalloConsentimiento.SinConexion), vm.uiState.value.consentimientos)
    }

    @Test
    fun `ver el detalle carga el comprobante o el no encontrado`() = runTest(despachador) {
        coEvery { repositorio.detalle("c-1") } returns Resultado.Exito(consentimiento)
        coEvery { repositorio.detalle("ajeno") } returns Resultado.Fallo(FalloConsentimiento.NoEncontrado)
        val vm = viewModel()

        vm.verConsentimiento("c-1")
        assertEquals(Carga.Cargando, vm.uiState.value.detalle)
        advanceUntilIdle()
        assertEquals(Carga.Lista(consentimiento), vm.uiState.value.detalle)

        vm.verConsentimiento("ajeno")
        advanceUntilIdle()
        assertEquals(Carga.Error(FalloConsentimiento.NoEncontrado), vm.uiState.value.detalle)
    }

    @Test
    fun `el texto vigente se pide en el idioma de la app`() = runTest(despachador) {
        val texto = TextoVigente("PERFILAMIENTO_PRECIO", "en-US", "v1", "T", "C", "A", listOf(6, 12), 12)
        coEvery { repositorio.textoVigente("PERFILAMIENTO_PRECIO", "en-US") } returns Resultado.Exito(texto)
        val vm = viewModel()

        vm.cargarTextoVigente("en-US")
        assertEquals(Carga.Cargando, vm.uiState.value.texto)
        advanceUntilIdle()

        assertEquals(Carga.Lista(texto), vm.uiState.value.texto)
    }

    // --- Otorgar -------------------------------------------------------------------------------

    @Test
    fun `otorgar muestra el comprobante y refresca la lista (AC1)`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(consentimiento, false))
        val vm = viewModel()

        vm.uiState.test {
            skipItems(1)
            vm.otorgar(solicitud)
            assertEquals(EstadoOtorgamiento.EnCurso, awaitItem().otorgamiento)
            assertFalse(vm.uiState.value.puedeOtorgar(Permiso.OPEN_FINANCE_OPEN_DATA))
            assertEquals(EstadoOtorgamiento.Otorgado(consentimiento, false), awaitItem().otorgamiento)
            cancelAndIgnoreRemainingEvents()
        }
        advanceUntilIdle()
        assertEquals(Carga.Lista(listOf(consentimiento)), vm.uiState.value.consentimientos)
        coVerify(exactly = 1) { repositorio.listar() }
    }

    @Test
    fun `reintentar tras un fallo reintentable reutiliza la misma clave (AC4)`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returnsMany listOf(
            Resultado.Fallo(FalloConsentimiento.SinConexion),
            Resultado.Fallo(FalloConsentimiento.ServicioNoDisponible),
            Resultado.Exito(Otorgamiento(consentimiento, repeticion = true)),
        )
        val vm = viewModel()

        vm.otorgar(solicitud)
        advanceUntilIdle()
        assertEquals(EstadoOtorgamiento.Fallido(FalloConsentimiento.SinConexion), vm.uiState.value.otorgamiento)
        vm.reintentarOtorgamiento()
        advanceUntilIdle()
        // Confirmar otra vez la misma solicitud también es un reintento del mismo intento.
        vm.descartarOtorgamiento()
        vm.otorgar(solicitud)
        advanceUntilIdle()

        assertEquals(listOf("clave-1", "clave-1", "clave-1"), clavesEnviadas())
        assertEquals(EstadoOtorgamiento.Otorgado(consentimiento, repeticion = true), vm.uiState.value.otorgamiento)
    }

    @Test
    fun `tras un exito el siguiente intento lleva una clave nueva`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(consentimiento, false))
        val vm = viewModel()

        vm.otorgar(solicitud)
        advanceUntilIdle()
        vm.otorgar(solicitud)
        advanceUntilIdle()

        assertEquals(listOf("clave-1", "clave-2"), clavesEnviadas())
    }

    @Test
    fun `tras un rechazo definitivo el siguiente intento lleva una clave nueva`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Fallo(FalloConsentimiento.VigenciaInvalida)
        val vm = viewModel()

        vm.otorgar(solicitud)
        advanceUntilIdle()
        vm.reintentarOtorgamiento() // sin intento pendiente: no hace nada
        advanceUntilIdle()
        vm.otorgar(solicitud)
        advanceUntilIdle()

        assertEquals(listOf("clave-1", "clave-2"), clavesEnviadas())
        assertEquals(EstadoOtorgamiento.Fallido(FalloConsentimiento.VigenciaInvalida), vm.uiState.value.otorgamiento)
    }

    @Test
    fun `una solicitud distinta es otro intento con otra clave`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Fallo(FalloConsentimiento.SinConexion)
        val vm = viewModel()

        vm.otorgar(solicitud)
        advanceUntilIdle()
        vm.otorgar(solicitud.copy(vigenciaMeses = 6))
        advanceUntilIdle()

        assertEquals(listOf("clave-1", "clave-2"), clavesEnviadas())
    }

    @Test
    fun `cancelar la biometria no llama al servidor y conserva el intento (AC2)`() = runTest(despachador) {
        coEvery { verificador.confirmar(any()) } returnsMany listOf(
            ConfirmacionBiometrica.CANCELADA,
            ConfirmacionBiometrica.CONFIRMADA,
        )
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(consentimiento, false))
        val vm = viewModel()

        vm.otorgar(solicitud)
        advanceUntilIdle()
        assertEquals(
            EstadoOtorgamiento.Fallido(FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.CANCELADA)),
            vm.uiState.value.otorgamiento,
        )
        coVerify(exactly = 0) { repositorio.otorgar(any(), any()) }

        vm.reintentarOtorgamiento()
        advanceUntilIdle()
        assertEquals(listOf("clave-1"), clavesEnviadas())
    }

    @Test
    fun `un toque repetido mientras otorga no envia una segunda solicitud`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(consentimiento, false))
        val vm = viewModel()

        vm.otorgar(solicitud)
        vm.otorgar(solicitud)
        advanceUntilIdle()

        coVerify(exactly = 1) { repositorio.otorgar(any(), any()) }
    }

    @Test
    fun `un permiso no soportado no inicia ningun intento (ADR 0001)`() = runTest(despachador) {
        val vm = viewModel()

        vm.otorgar(solicitud.copy(permiso = Permiso.BIOMETRICOS_IDENTIDAD))
        advanceUntilIdle()

        assertEquals(EstadoOtorgamiento.Inactivo, vm.uiState.value.otorgamiento)
        coVerify(exactly = 0) { verificador.confirmar(any()) }
        coVerify(exactly = 0) { repositorio.otorgar(any(), any()) }
    }

    @Test
    fun `descartar cierra el resultado`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Fallo(FalloConsentimiento.YaVigente("c-0"))
        val vm = viewModel()
        vm.otorgar(solicitud)
        advanceUntilIdle()

        vm.descartarOtorgamiento()

        assertEquals(EstadoOtorgamiento.Inactivo, vm.uiState.value.otorgamiento)
    }

    @Test
    fun `por defecto la clave es un UUID nuevo por intento`() = runTest(despachador) {
        coEvery { repositorio.otorgar(any(), any()) } returns Resultado.Exito(Otorgamiento(consentimiento, false))
        val vm = PrivacidadViewModelFactory(repositorio, verificador).create(PrivacidadViewModel::class.java)

        vm.otorgar(solicitud)
        advanceUntilIdle()
        vm.otorgar(solicitud)
        advanceUntilIdle()

        val (primera, segunda) = clavesEnviadas()
        assertEquals(primera, java.util.UUID.fromString(primera).toString())
        assertNotEquals(primera, segunda)
        assertIs<EstadoOtorgamiento.Otorgado>(vm.uiState.value.otorgamiento)
    }

    @Test
    fun `los fallos que dejan el resultado incierto son reintentables`() {
        val reintentables = listOf(
            FalloConsentimiento.SinConexion,
            FalloConsentimiento.ServicioNoDisponible,
            FalloConsentimiento.RespuestaInvalida,
            FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.CANCELADA),
        )
        val definitivos = listOf(
            FalloConsentimiento.SesionVencida,
            FalloConsentimiento.NoAutorizado,
            FalloConsentimiento.IdentidadNoVerificada,
            FalloConsentimiento.ClienteNoEncontrado,
            FalloConsentimiento.NoEncontrado,
            FalloConsentimiento.YaVigente(null),
            FalloConsentimiento.SolicitudInvalida(emptyList()),
            FalloConsentimiento.VigenciaInvalida,
            FalloConsentimiento.TextoNoVigente,
            FalloConsentimiento.IdempotenciaConflicto,
            FalloConsentimiento.PermisoNoDisponible,
        )
        assertTrue(reintentables.all { it.reintentable })
        assertTrue(definitivos.none { it.reintentable })
    }
}
