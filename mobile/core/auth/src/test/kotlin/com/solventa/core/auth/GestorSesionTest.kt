package com.solventa.core.auth

import io.mockk.coEvery
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GestorSesionTest {
    private val sesion = SesionAuth(accessToken = "access-1", idToken = "id-1", expiraEnMillis = 123L)

    @Test
    fun `iniciarSesion exitoso guarda el usuario activo y actualiza el estado`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val almacen = FakeAlmacenSesionSegura()
        coEvery { clienteIdentidad.autenticar("ana", "clave-1") } returns ResultadoAutenticacion.Exito(sesion)
        val gestor = GestorSesion(clienteIdentidad, almacen)

        val resultado = gestor.iniciarSesion("ana", "clave-1")

        assertIs<ResultadoAutenticacion.Exito>(resultado)
        assertEquals("ana", almacen.usuarioActivo())
        assertEquals("id-1", gestor.actual())
        assertIs<EstadoSesion.Autenticada>(gestor.estado.value)
    }

    @Test
    fun `iniciarSesion con credenciales invalidas no guarda usuario ni autentica`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val almacen = FakeAlmacenSesionSegura()
        coEvery { clienteIdentidad.autenticar("ana", "mala") } returns ResultadoAutenticacion.CredencialesInvalidas
        val gestor = GestorSesion(clienteIdentidad, almacen)

        val resultado = gestor.iniciarSesion("ana", "mala")

        assertEquals(ResultadoAutenticacion.CredencialesInvalidas, resultado)
        assertNull(almacen.usuarioActivo())
        assertNull(gestor.actual())
        assertEquals(EstadoSesion.NoAutenticada, gestor.estado.value)
    }

    @Test
    fun `confirmarCodigoMfa exitoso afianza la sesion del ingreso en curso`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val almacen = FakeAlmacenSesionSegura()
        coEvery { clienteIdentidad.autenticar("ana", "clave-1") } returns ResultadoAutenticacion.CodigoMfaRequerido
        coEvery { clienteIdentidad.confirmarCodigoMfa("111111") } returns ResultadoAutenticacion.Exito(sesion)
        val gestor = GestorSesion(clienteIdentidad, almacen)
        gestor.iniciarSesion("ana", "clave-1")

        val resultado = gestor.confirmarCodigoMfa("111111")

        assertIs<ResultadoAutenticacion.Exito>(resultado)
        assertEquals("ana", almacen.usuarioActivo())
        assertEquals("id-1", gestor.actual())
    }

    @Test
    fun `confirmarCodigoMfa sin un ingreso en curso no llama a ClienteIdentidad`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val gestor = GestorSesion(clienteIdentidad, FakeAlmacenSesionSegura())

        val resultado = gestor.confirmarCodigoMfa("111111")

        assertIs<ResultadoAutenticacion.ErrorDesconocido>(resultado)
    }

    @Test
    fun `restaurarSesion exitosa actualiza el estado sin pedir credenciales`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val almacen = FakeAlmacenSesionSegura().apply { guardarUsuarioActivo("ana") }
        coEvery { clienteIdentidad.restaurarSesion("ana") } returns ResultadoAutenticacion.Exito(sesion)
        val gestor = GestorSesion(clienteIdentidad, almacen)

        val restaurada = gestor.restaurarSesion()

        assertTrue(restaurada)
        assertEquals("id-1", gestor.actual())
    }

    @Test
    fun `restaurarSesion sin usuario activo no consulta a ClienteIdentidad`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val gestor = GestorSesion(clienteIdentidad, FakeAlmacenSesionSegura())

        val restaurada = gestor.restaurarSesion()

        assertFalse(restaurada)
        assertNull(gestor.actual())
    }

    @Test
    fun `restaurarSesion con sesion no disponible limpia el almacen`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val almacen = FakeAlmacenSesionSegura().apply { guardarUsuarioActivo("ana") }
        coEvery { clienteIdentidad.restaurarSesion("ana") } returns ResultadoAutenticacion.SesionNoDisponible
        val gestor = GestorSesion(clienteIdentidad, almacen)

        val restaurada = gestor.restaurarSesion()

        assertFalse(restaurada)
        assertNull(almacen.usuarioActivo())
        assertEquals(EstadoSesion.NoAutenticada, gestor.estado.value)
    }

    @Test
    fun `cerrarSesion limpia el almacen y cierra sesion en ClienteIdentidad`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>(relaxed = true)
        val almacen = FakeAlmacenSesionSegura()
        coEvery { clienteIdentidad.autenticar("ana", "clave-1") } returns ResultadoAutenticacion.Exito(sesion)
        val gestor = GestorSesion(clienteIdentidad, almacen)
        gestor.iniciarSesion("ana", "clave-1")

        gestor.cerrarSesion()

        verify { clienteIdentidad.cerrarSesion("ana") }
        assertNull(almacen.usuarioActivo())
        assertNull(gestor.actual())
        assertEquals(EstadoSesion.NoAutenticada, gestor.estado.value)
    }

    @Test
    fun `haySesionGuardada refleja si el almacen tiene un usuario activo`() = runTest {
        val clienteIdentidad = mockk<ClienteIdentidad>()
        val almacen = FakeAlmacenSesionSegura()
        val gestor = GestorSesion(clienteIdentidad, almacen)

        assertFalse(gestor.haySesionGuardada())
        almacen.guardarUsuarioActivo("ana")
        assertTrue(gestor.haySesionGuardada())
    }

    private class FakeAlmacenSesionSegura : AlmacenSesionSegura {
        private var usuario: String? = null

        override fun guardarUsuarioActivo(usuario: String) {
            this.usuario = usuario
        }

        override fun usuarioActivo(): String? = usuario

        override fun limpiar() {
            usuario = null
        }
    }
}
