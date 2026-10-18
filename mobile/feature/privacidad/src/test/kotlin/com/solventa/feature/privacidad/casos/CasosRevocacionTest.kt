package com.solventa.feature.privacidad.casos

import com.solventa.feature.privacidad.dominio.AccionBiometrica
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import java.time.Instant
import kotlin.test.assertEquals

/** Revocar e historial (HU-M09): la biometría va antes del servidor (ADR 0007). */
class CasosRevocacionTest {
    private val repositorio = mockk<RepositorioConsentimientos>()
    private val verificador = mockk<VerificadorBiometrico>()
    private val revocado = Consentimiento(
        id = "c-1",
        estado = EstadoConsentimiento.REVOCADO,
        proposito = "PERFILAMIENTO_PRECIO",
        alcances = listOf("FA_PRODUCTOS_VIGENTES"),
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
        otorgadoEn = Instant.parse("2026-10-17T15:00:00Z"),
        vigenteHasta = Instant.parse("2027-10-17T23:59:59Z"),
        revocadoEn = Instant.parse("2026-11-02T08:15:00Z"),
    )

    @Test
    fun `revocar pide la biometria de revocar y despues llama al servidor`() = runTest {
        coEvery { verificador.confirmar(AccionBiometrica.REVOCAR) } returns ConfirmacionBiometrica.CONFIRMADA
        coEvery { repositorio.revocar("c-1") } returns Resultado.Exito(revocado)

        assertEquals(Resultado.Exito(revocado), RevocarConsentimiento(repositorio, verificador)("c-1"))
        coVerify(exactly = 1) { verificador.confirmar(AccionBiometrica.REVOCAR) }
    }

    @ParameterizedTest
    @EnumSource(value = ConfirmacionBiometrica::class, names = ["CANCELADA", "NO_DISPONIBLE", "FALLIDA"])
    fun `sin confirmacion biometrica no se llama al servidor`(confirmacion: ConfirmacionBiometrica) = runTest {
        coEvery { verificador.confirmar(any()) } returns confirmacion

        assertEquals(
            Resultado.Fallo(FalloConsentimiento.BiometriaNoConfirmada(confirmacion)),
            RevocarConsentimiento(repositorio, verificador)("c-1"),
        )
        coVerify(exactly = 0) { repositorio.revocar(any()) }
    }

    @Test
    fun `un fallo del servidor se devuelve tal cual`() = runTest {
        coEvery { verificador.confirmar(any()) } returns ConfirmacionBiometrica.CONFIRMADA
        coEvery { repositorio.revocar("ajeno") } returns Resultado.Fallo(FalloConsentimiento.NoEncontrado)

        assertEquals(
            Resultado.Fallo(FalloConsentimiento.NoEncontrado),
            RevocarConsentimiento(repositorio, verificador)("ajeno"),
        )
    }

    @Test
    fun `el historial se pide sin biometria`() = runTest {
        val historial = Historial("c-1", EstadoConsentimiento.REVOCADO, emptyList())
        coEvery { repositorio.historial("c-1") } returns Resultado.Exito(historial)

        assertEquals(Resultado.Exito(historial), VerHistorialConsentimiento(repositorio)("c-1"))
        coVerify(exactly = 0) { verificador.confirmar(any()) }
    }
}
