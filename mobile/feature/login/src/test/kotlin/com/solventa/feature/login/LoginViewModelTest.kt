package com.solventa.feature.login

import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.auth.SesionAuth
import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.ResultadoSesion
import com.solventa.core.network.modelo.SesionDto
import com.solventa.core.security.Disponibilidad
import com.solventa.core.security.GestorBiometria
import com.solventa.core.security.ResultadoBiometria
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {
    private val sesionAuth = SesionAuth(accessToken = "access-1", idToken = "id-1", expiraEnMillis = 1L)
    private val sesionDto = SesionDto(clienteId = "cliente-1", serviciosAutorizados = emptyList(), expiraEn = "2026-01-01T00:00:00Z")
    private lateinit var gestorSesion: GestorSesion
    private lateinit var gestorBiometria: GestorBiometria
    private lateinit var bffMovilCliente: BffMovilCliente

    @Before
    fun preparar() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        gestorSesion = mockk(relaxUnitFun = true)
        gestorBiometria = mockk()
        bffMovilCliente = mockk()
        every { gestorBiometria.disponibilidad() } returns Disponibilidad.DISPONIBLE
        every { gestorSesion.haySesionGuardada() } returns true
    }

    @After
    fun terminar() {
        Dispatchers.resetMain()
    }

    private fun crearViewModel() = LoginViewModel(gestorSesion, gestorBiometria, bffMovilCliente)

    @Test
    fun `al volver al ingreso tras registrarse se ofrece la biometria con la sesion recien guardada`() {
        every { gestorSesion.haySesionGuardada() } returns false
        val viewModel = crearViewModel()
        assertFalse(viewModel.uiState.value.mostrarBiometria)

        every { gestorSesion.haySesionGuardada() } returns true
        viewModel.alMostrarse()

        assertTrue(viewModel.uiState.value.mostrarBiometria)
    }

    @Test
    fun `alMostrarse no reactiva la biometria tras superar el limite de intentos`() {
        val viewModel = crearViewModel()
        repeat(3) { viewModel.onResultadoBiometria(ResultadoBiometria.Error("no reconocido")) }
        assertFalse(viewModel.uiState.value.mostrarBiometria)

        viewModel.alMostrarse()

        assertFalse(viewModel.uiState.value.mostrarBiometria)
    }

    @Test
    fun `el panel biometrico exige hardware disponible Y una sesion guardada (AC3)`() {
        every { gestorBiometria.disponibilidad() } returns Disponibilidad.SIN_HUELLAS_REGISTRADAS
        every { gestorSesion.haySesionGuardada() } returns true
        assertFalse(crearViewModel().uiState.value.mostrarBiometria)

        every { gestorBiometria.disponibilidad() } returns Disponibilidad.DISPONIBLE
        every { gestorSesion.haySesionGuardada() } returns false
        assertFalse(crearViewModel().uiState.value.mostrarBiometria)

        every { gestorBiometria.disponibilidad() } returns Disponibilidad.DISPONIBLE
        every { gestorSesion.haySesionGuardada() } returns true
        assertTrue(crearViewModel().uiState.value.mostrarBiometria)
    }

    @Test
    fun `puedeIngresar exige correo y contrasena no vacios`() = runTest {
        val viewModel = crearViewModel()

        assertFalse(viewModel.uiState.value.puedeIngresar)
        viewModel.onCorreoCambiado("ana@solventa.com")
        assertFalse(viewModel.uiState.value.puedeIngresar)
        viewModel.onContrasenaCambiada("clave-1")
        assertTrue(viewModel.uiState.value.puedeIngresar)
    }

    @Test
    fun `ingresar exitoso solo se da por completo cuando el servidor confirma la sesion (AC1)`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.iniciarSesion("ana@solventa.com", "clave-1") } returns ResultadoAutenticacion.Exito(sesionAuth)
        coEvery { bffMovilCliente.consultarSesion() } returns ResultadoSesion.Exito(sesionDto)
        viewModel.onCorreoCambiado("ana@solventa.com")
        viewModel.onContrasenaCambiada("clave-1")

        viewModel.ingresar()

        assertNull(viewModel.uiState.value.errorCredenciales)
        assertFalse(viewModel.uiState.value.cargando)
        assertTrue(viewModel.uiState.value.ingresoCompleto)
    }

    @Test
    fun `ingresar exitoso en Cognito pero el servidor no autentica no se da por completo`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.iniciarSesion(any(), any()) } returns ResultadoAutenticacion.Exito(sesionAuth)
        coEvery { bffMovilCliente.consultarSesion() } returns ResultadoSesion.NoAutenticado("token inválido")
        viewModel.onCorreoCambiado("ana@solventa.com")
        viewModel.onContrasenaCambiada("clave-1")

        viewModel.ingresar()

        assertFalse(viewModel.uiState.value.ingresoCompleto)
        assertEquals(MensajeLogin.SesionRevocada, viewModel.uiState.value.mensaje)
    }

    @Test
    fun `ingresar con credenciales invalidas muestra el recurso de texto correspondiente`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.iniciarSesion(any(), any()) } returns ResultadoAutenticacion.CredencialesInvalidas
        viewModel.onCorreoCambiado("ana@solventa.com")
        viewModel.onContrasenaCambiada("mala")

        viewModel.ingresar()

        assertEquals(
            TextoLogin.Recurso(R.string.login_error_credenciales_invalidas),
            viewModel.uiState.value.errorCredenciales,
        )
        coVerify(exactly = 0) { bffMovilCliente.consultarSesion() }
    }

    @Test
    fun `ingresar con ErrorDesconocido muestra el mensaje dinamico, no uno generico`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.iniciarSesion(any(), any()) } returns
            ResultadoAutenticacion.ErrorDesconocido("Falta configurar Cognito en local.properties")
        viewModel.onCorreoCambiado("ana@solventa.com")
        viewModel.onContrasenaCambiada("clave-1")

        viewModel.ingresar()

        assertEquals(
            TextoLogin.Dinamico("Falta configurar Cognito en local.properties"),
            viewModel.uiState.value.errorCredenciales,
        )
    }

    @Test
    fun `resultado biometrico exitoso restaura sesion y el servidor confirma (AC1)`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.restaurarSesion() } returns true
        coEvery { bffMovilCliente.consultarSesion() } returns ResultadoSesion.Exito(sesionDto)

        viewModel.onResultadoBiometria(ResultadoBiometria.Exito)

        assertTrue(viewModel.uiState.value.ingresoCompleto)
        assertNull(viewModel.uiState.value.mensaje)
    }

    @Test
    fun `resultado biometrico exitoso pero sin sesion local en cache pide credenciales`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.restaurarSesion() } returns false

        viewModel.onResultadoBiometria(ResultadoBiometria.Exito)

        assertFalse(viewModel.uiState.value.mostrarBiometria)
        assertEquals(MensajeLogin.SesionRevocada, viewModel.uiState.value.mensaje)
        coVerify(exactly = 0) { bffMovilCliente.consultarSesion() }
    }

    @Test
    fun `resultado biometrico exitoso con sesion local valida pero el servidor la rechaza (AC4)`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.restaurarSesion() } returns true
        coEvery { bffMovilCliente.consultarSesion() } returns ResultadoSesion.NoAutenticado("revocada")

        viewModel.onResultadoBiometria(ResultadoBiometria.Exito)

        assertFalse(viewModel.uiState.value.ingresoCompleto)
        assertFalse(viewModel.uiState.value.mostrarBiometria)
        assertEquals(MensajeLogin.SesionRevocada, viewModel.uiState.value.mensaje)
        coVerify { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `resultado biometrico exitoso con falla del servidor no confirmada no se presenta como revocacion`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.restaurarSesion() } returns true
        coEvery { bffMovilCliente.consultarSesion() } returns ResultadoSesion.ServicioNoDisponible("caído")

        viewModel.onResultadoBiometria(ResultadoBiometria.Exito)

        assertFalse(viewModel.uiState.value.ingresoCompleto)
        assertEquals(MensajeLogin.ErrorVerificacion, viewModel.uiState.value.mensaje)
        // No se trata como revocación real: se sigue ofreciendo biometría para reintentar.
        assertTrue(viewModel.uiState.value.mostrarBiometria)
    }

    @Test
    fun `resultado biometrico cancelado no cambia el estado`() = runTest {
        val viewModel = crearViewModel()
        val estadoPrevio = viewModel.uiState.value

        viewModel.onResultadoBiometria(ResultadoBiometria.Cancelado)

        assertEquals(estadoPrevio, viewModel.uiState.value)
    }

    @Test
    fun `resultado biometrico bloqueado oculta el panel y muestra el limite (AC3)`() = runTest {
        val viewModel = crearViewModel()

        viewModel.onResultadoBiometria(ResultadoBiometria.Bloqueado)

        assertFalse(viewModel.uiState.value.mostrarBiometria)
        assertEquals(MensajeLogin.LimiteBiometriaSuperado, viewModel.uiState.value.mensaje)
    }

    @Test
    fun `errores biometricos permiten reintentar hasta el limite configurado (AC2)`() = runTest {
        val viewModel = crearViewModel()

        viewModel.onResultadoBiometria(ResultadoBiometria.Error("no reconocido"))
        assertTrue(viewModel.uiState.value.mostrarBiometria)
        assertEquals(MensajeLogin.ReintentarBiometria, viewModel.uiState.value.mensaje)

        viewModel.onResultadoBiometria(ResultadoBiometria.Error("no reconocido"))
        assertTrue(viewModel.uiState.value.mostrarBiometria)

        viewModel.onResultadoBiometria(ResultadoBiometria.Error("no reconocido"))
        assertFalse(viewModel.uiState.value.mostrarBiometria)
        assertEquals(MensajeLogin.LimiteBiometriaSuperado, viewModel.uiState.value.mensaje)
    }
}
