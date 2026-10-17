package com.solventa.feature.onboardingidentidad.verificacion

import com.solventa.core.network.RegistroCliente
import com.solventa.core.network.ResultadoVerificacionRegistro
import com.solventa.feature.onboardingidentidad.captura.SelfieEnMemoria
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Test
import java.util.Base64
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class VerificarIdentidadTest {
    private val cliente = mockk<RegistroCliente>()
    private var contador = 0
    private val sesion = SesionRegistro(generarId = { "registro-${++contador}" }).apply { correo = "ana@solventa.com" }
    private val verificada = ResultadoVerificacionRegistro.Verificada(clienteId = "c1", tokenRegistro = "v1.token", expiraEn = null)

    @Test
    fun `envia registroId correo selfie en base64 y prueba de vida`() = runTest {
        val bytes = byteArrayOf(10, 20, 30)
        val esperado = Base64.getEncoder().encodeToString(bytes)
        coEvery { cliente.verificar(any(), any(), any(), any()) } returns verificada

        val resultado = VerificarIdentidad(cliente, sesion)(SelfieEnMemoria(bytes), pruebaDeVidaCompletada = true)

        assertEquals(verificada, resultado)
        coVerify(exactly = 1) { cliente.verificar("registro-1", "ana@solventa.com", esperado, true) }
    }

    @Test
    fun `con una selfie de prueba local envia ese texto y no la imagen`() = runTest {
        coEvery { cliente.verificar(any(), any(), any(), any()) } returns verificada

        VerificarIdentidad(cliente, sesion, selfieDePruebaLocal = "selfie-sintetica-aprobada")(
            SelfieEnMemoria(byteArrayOf(1, 2, 3)),
            pruebaDeVidaCompletada = true,
        )

        coVerify(exactly = 1) { cliente.verificar("registro-1", "ana@solventa.com", "selfie-sintetica-aprobada", true) }
    }

    @Test
    fun `una verificacion exitosa deja el tokenRegistro en la sesion`() = runTest {
        coEvery { cliente.verificar(any(), any(), any(), any()) } returns verificada

        VerificarIdentidad(cliente, sesion)(SelfieEnMemoria(byteArrayOf(1)), true)

        assertEquals("v1.token", sesion.tokenRegistro)
    }

    @Test
    fun `los reintentos reutilizan el mismo registroId`() = runTest {
        coEvery { cliente.verificar(any(), any(), any(), any()) } returns
            ResultadoVerificacionRegistro.ServicioNoDisponible(correlationId = null)
        val verificar = VerificarIdentidad(cliente, sesion)

        verificar(SelfieEnMemoria(byteArrayOf(1)), true)
        verificar(SelfieEnMemoria(byteArrayOf(1)), true)

        coVerify(exactly = 2) { cliente.verificar("registro-1", any(), any(), any()) }
        assertNull(sesion.tokenRegistro)
    }

    @Test
    fun `si el correo no coincide con la verificacion el siguiente intento usa un registroId nuevo`() = runTest {
        coEvery { cliente.verificar(any(), any(), any(), any()) } returns
            ResultadoVerificacionRegistro.CorreoDistinto(correlationId = null)
        val antes = sesion.registroId

        VerificarIdentidad(cliente, sesion)(SelfieEnMemoria(byteArrayOf(1)), true)

        assertNotEquals(antes, sesion.registroId)
    }
}
