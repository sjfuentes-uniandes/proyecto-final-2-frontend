package com.solventa.feature.login

import com.solventa.core.auth.EstadoSesion
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.auth.SesionAuth
import com.solventa.core.security.Disponibilidad
import com.solventa.core.security.GestorBiometria
import com.solventa.core.security.ResultadoBiometria
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
    private val sesion = SesionAuth(accessToken = "access-1", idToken = "id-1", expiraEnMillis = 1L)
    private val estadoSesion = MutableStateFlow<EstadoSesion>(EstadoSesion.NoAutenticada)
    private lateinit var gestorSesion: GestorSesion
    private lateinit var gestorBiometria: GestorBiometria

    @Before
    fun preparar() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        gestorSesion = mockk()
        gestorBiometria = mockk()
        every { gestorSesion.estado } returns estadoSesion
        every { gestorBiometria.disponibilidad() } returns Disponibilidad.DISPONIBLE
    }

    @After
    fun terminar() {
        Dispatchers.resetMain()
    }

    private fun crearViewModel() = LoginViewModel(gestorSesion, gestorBiometria)

    @Test
    fun `al crearse muestra el panel biometrico solo si esta disponible`() {
        every { gestorBiometria.disponibilidad() } returns Disponibilidad.SIN_HUELLAS_REGISTRADAS

        val viewModel = crearViewModel()

        assertFalse(viewModel.uiState.value.mostrarBiometria)
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
    fun `ingresar exitoso limpia el error y no bloquea biometria`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.iniciarSesion("ana@solventa.com", "clave-1") } returns ResultadoAutenticacion.Exito(sesion)
        viewModel.onCorreoCambiado("ana@solventa.com")
        viewModel.onContrasenaCambiada("clave-1")

        viewModel.ingresar()

        assertNull(viewModel.uiState.value.errorCredenciales)
        assertFalse(viewModel.uiState.value.cargando)
    }

    @Test
    fun `ingresar con credenciales invalidas muestra el mensaje de error`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.iniciarSesion(any(), any()) } returns ResultadoAutenticacion.CredencialesInvalidas
        viewModel.onCorreoCambiado("ana@solventa.com")
        viewModel.onContrasenaCambiada("mala")

        viewModel.ingresar()

        assertEquals("Usuario o contraseña incorrectos", viewModel.uiState.value.errorCredenciales)
    }

    @Test
    fun `ingresar con ErrorDesconocido muestra el mensaje especifico, no uno generico`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.iniciarSesion(any(), any()) } returns
            ResultadoAutenticacion.ErrorDesconocido("Falta configurar Cognito en local.properties")
        viewModel.onCorreoCambiado("ana@solventa.com")
        viewModel.onContrasenaCambiada("clave-1")

        viewModel.ingresar()

        assertEquals("Falta configurar Cognito en local.properties", viewModel.uiState.value.errorCredenciales)
    }

    @Test
    fun `resultado biometrico exitoso restaura la sesion`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.restaurarSesion() } returns true

        viewModel.onResultadoBiometria(ResultadoBiometria.Exito)

        assertTrue(viewModel.uiState.value.mostrarBiometria)
        assertNull(viewModel.uiState.value.mensaje)
    }

    @Test
    fun `resultado biometrico exitoso pero sesion revocada en el servidor pide credenciales (AC4)`() = runTest {
        val viewModel = crearViewModel()
        coEvery { gestorSesion.restaurarSesion() } returns false

        viewModel.onResultadoBiometria(ResultadoBiometria.Exito)

        assertFalse(viewModel.uiState.value.mostrarBiometria)
        assertEquals(MensajeLogin.SesionRevocada, viewModel.uiState.value.mensaje)
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

    @Test
    fun `sesionActiva refleja el estado de GestorSesion`() = runTest {
        val viewModel = crearViewModel()
        assertFalse(viewModel.sesionActiva.value)

        estadoSesion.value = EstadoSesion.Autenticada(sesion)

        assertTrue(viewModel.sesionActiva.value)
    }
}
