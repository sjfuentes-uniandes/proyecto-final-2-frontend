package com.solventa.feature.privacidad.casos

import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import kotlin.test.assertEquals
import kotlin.test.assertSame

class CasosConsentimientoTest {
    private val repositorio = mockk<RepositorioConsentimientos>()
    private val verificador = mockk<VerificadorBiometrico>()
    private val otorgar = OtorgarConsentimiento(repositorio, verificador)

    private fun solicitud(permiso: Permiso = Permiso.OPEN_FINANCE_OPEN_DATA) = SolicitudOtorgamiento(
        permiso = permiso,
        alcances = setOf(Alcance.FA_PRODUCTOS_VIGENTES),
        vigenciaMeses = 12,
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
    )

    @Test
    fun `listar, detalle y texto delegan en el repositorio`() = runTest {
        val lista = Resultado.Exito(emptyList<com.solventa.feature.privacidad.dominio.Consentimiento>())
        val detalle = Resultado.Fallo(FalloConsentimiento.NoEncontrado)
        val texto = Resultado.Fallo(FalloConsentimiento.SinConexion)
        coEvery { repositorio.listar() } returns lista
        coEvery { repositorio.detalle("id-1") } returns detalle
        coEvery { repositorio.textoVigente(any(), any()) } returns texto

        assertSame(lista, ListarConsentimientos(repositorio)())
        assertSame(detalle, VerDetalleConsentimiento(repositorio)("id-1"))
        assertSame(texto, ObtenerTextoVigente(repositorio)("en-US"))
        // El texto siempre es del único propósito del módulo.
        coVerify { repositorio.textoVigente("PERFILAMIENTO_PRECIO", "en-US") }
    }

    @ParameterizedTest
    @EnumSource(value = Permiso::class, names = ["DATOS_PERSONALES_FINANCIEROS", "BIOMETRICOS_IDENTIDAD"])
    fun `un permiso no soportado no pide biometria ni llama al servidor (ADR 0001)`(permiso: Permiso) = runTest {
        val resultado = otorgar(solicitud(permiso), "clave")

        assertEquals(Resultado.Fallo(FalloConsentimiento.PermisoNoDisponible), resultado)
        coVerify(exactly = 0) { verificador.confirmar() }
        coVerify(exactly = 0) { repositorio.otorgar(any(), any()) }
    }

    @ParameterizedTest
    @EnumSource(value = ConfirmacionBiometrica::class, names = ["CANCELADA", "NO_DISPONIBLE", "FALLIDA"])
    fun `sin confirmacion biometrica no se otorga nada (ADR 0007, AC2)`(confirmacion: ConfirmacionBiometrica) = runTest {
        coEvery { verificador.confirmar() } returns confirmacion

        val resultado = otorgar(solicitud(), "clave")

        assertEquals(Resultado.Fallo(FalloConsentimiento.BiometriaNoConfirmada(confirmacion)), resultado)
        coVerify(exactly = 0) { repositorio.otorgar(any(), any()) }
    }

    @Test
    fun `con biometria confirmada otorga con la clave del intento`() = runTest {
        val esperado = Resultado.Fallo(FalloConsentimiento.ServicioNoDisponible)
        coEvery { verificador.confirmar() } returns ConfirmacionBiometrica.CONFIRMADA
        coEvery { repositorio.otorgar(any(), any()) } returns esperado

        val resultado = otorgar(solicitud(), "clave-7")

        assertSame(esperado, resultado)
        coVerify(exactly = 1) { repositorio.otorgar(solicitud(), "clave-7") }
    }
}
