package com.solventa.feature.onboardingidentidad.verificacion

import com.solventa.core.auth.ClienteRegistro
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.auth.ResultadoConfirmacion
import com.solventa.core.auth.ResultadoRegistroCuenta
import com.solventa.core.network.RegistroCliente
import com.solventa.core.network.ResultadoVinculacion
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

class CrearCuentaTest {
    private val cognito = mockk<ClienteRegistro>()
    private val gestor = mockk<GestorSesion>()
    private val registroCliente = mockk<RegistroCliente>()
    private val sesion = SesionRegistro { "reg-1" }

    private fun crear(local: Boolean = false) = CrearCuenta(cognito, gestor, registroCliente, sesion, local)

    private fun conToken() = sesion.guardarToken("token")

    @Test
    fun `sin token de registro exige verificar de nuevo`() = runTest {
        assertEquals(ResultadoCuenta.RequiereVerificar, crear().registrar("a@b.co", "Clave12345x"))
    }

    @Test
    fun `signup sin confirmar pide el codigo y al confirmar ingresa y vincula`() = runTest {
        conToken()
        coEvery { cognito.registrar("a@b.co", "Clave12345x", "token") } returns ResultadoRegistroCuenta.Creada(false)
        coEvery { cognito.confirmar("a@b.co", "123456") } returns ResultadoConfirmacion.Confirmada
        coEvery { gestor.iniciarSesion("a@b.co", "Clave12345x") } returns ResultadoAutenticacion.Exito(mockk())
        coEvery { registroCliente.vincular("reg-1", "token") } returns ResultadoVinculacion.Vinculada("c1")
        val caso = crear()

        assertEquals(ResultadoCuenta.CodigoRequerido, caso.registrar("a@b.co", "Clave12345x"))
        assertEquals(ResultadoCuenta.Completada, caso.confirmar("a@b.co", "123456"))
    }

    @Test
    fun `token rechazado por el pre sign-up exige verificar de nuevo`() = runTest {
        conToken()
        coEvery { cognito.registrar(any(), any(), any()) } returns ResultadoRegistroCuenta.TokenRegistroRechazado
        assertEquals(ResultadoCuenta.RequiereVerificar, crear().registrar("a@b.co", "Clave12345x"))
    }

    @Test
    fun `correo ya registrado lleva al ingreso`() = runTest {
        conToken()
        coEvery { cognito.registrar(any(), any(), any()) } returns ResultadoRegistroCuenta.CorreoYaRegistrado
        assertEquals(ResultadoCuenta.CuentaExistente, crear().registrar("a@b.co", "Clave12345x"))
    }

    @Test
    fun `fallo del ingreso tras confirmar deja el ingreso pendiente`() = runTest {
        conToken()
        coEvery { cognito.confirmar(any(), any()) } returns ResultadoConfirmacion.Confirmada
        assertEquals(ResultadoCuenta.IngresoPendiente, crear().confirmar("a@b.co", "123456"))
    }

    @Test
    fun `vinculacion no disponible se puede reintentar sin repetir el signup`() = runTest {
        conToken()
        coEvery { cognito.registrar(any(), any(), any()) } returns ResultadoRegistroCuenta.Creada(true)
        coEvery { gestor.iniciarSesion(any(), any()) } returns ResultadoAutenticacion.Exito(mockk())
        coEvery { registroCliente.vincular(any(), any()) } returnsMany listOf(
            ResultadoVinculacion.ServicioNoDisponible(null),
            ResultadoVinculacion.Vinculada("c1"),
        )
        val caso = crear()

        assertEquals(ResultadoCuenta.VinculacionPendiente, caso.registrar("a@b.co", "Clave12345x"))
        assertEquals(ResultadoCuenta.Completada, caso.reintentarVinculacion())
        coVerify(exactly = 1) { cognito.registrar(any(), any(), any()) }
    }

    @Test
    fun `modo local valida el token y vincula sin Cognito`() = runTest {
        conToken()
        coEvery { registroCliente.validarLocal("token", "a@b.co") } returns true
        coEvery { registroCliente.vincular("reg-1", "token") } returns ResultadoVinculacion.Vinculada("c1")

        assertEquals(ResultadoCuenta.Completada, crear(local = true).registrar("a@b.co", "Clave12345x"))
        coVerify(exactly = 0) { cognito.registrar(any(), any(), any()) }
    }

    @Test
    fun `modo local con token invalido exige verificar de nuevo`() = runTest {
        conToken()
        coEvery { registroCliente.validarLocal(any(), any()) } returns false
        assertEquals(ResultadoCuenta.RequiereVerificar, crear(local = true).registrar("a@b.co", "Clave12345x"))
    }
}
