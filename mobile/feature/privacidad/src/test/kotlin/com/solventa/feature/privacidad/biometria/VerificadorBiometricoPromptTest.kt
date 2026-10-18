package com.solventa.feature.privacidad.biometria

import androidx.fragment.app.FragmentActivity
import com.solventa.core.security.Disponibilidad
import com.solventa.core.security.GestorBiometria
import com.solventa.core.security.ResultadoBiometria
import com.solventa.feature.privacidad.R
import com.solventa.feature.privacidad.dominio.AccionBiometrica
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.Arguments
import org.junit.jupiter.params.provider.MethodSource
import kotlin.test.assertEquals

/** [VerificadorBiometricoPrompt] con dobles de [GestorBiometria] y de la actividad (sin dispositivo). */
class VerificadorBiometricoPromptTest {
    private val gestor = mockk<GestorBiometria>()
    private val actividad = mockk<FragmentActivity>()
    private val verificador = VerificadorBiometricoPrompt(gestor)

    @BeforeEach
    fun preparar() {
        every { gestor.disponibilidad() } returns Disponibilidad.DISPONIBLE
        every { actividad.getString(R.string.privacidad_biometria_titulo) } returns "titulo"
        every { actividad.getString(R.string.privacidad_biometria_subtitulo) } returns "subtitulo"
        every { actividad.getString(R.string.privacidad_biometria_negativo) } returns "negativo"
        every { actividad.getString(R.string.privacidad_biometria_revocar_titulo) } returns "titulo-revocar"
        every { actividad.getString(R.string.privacidad_biometria_revocar_subtitulo) } returns "subtitulo-revocar"
    }

    @Test
    fun `al revocar el dialogo dice revocar (ADR 0007)`() = runTest {
        coEvery { gestor.autenticar(any(), any(), any(), any()) } returns ResultadoBiometria.Exito
        verificador.adjuntar(actividad)

        assertEquals(ConfirmacionBiometrica.CONFIRMADA, verificador.confirmar(AccionBiometrica.REVOCAR))
        coVerify { gestor.autenticar(actividad, "titulo-revocar", "subtitulo-revocar", "negativo") }
    }

    @ParameterizedTest
    @MethodSource("resultados")
    fun `traduce el resultado del dialogo`(resultado: ResultadoBiometria, esperado: ConfirmacionBiometrica) = runTest {
        coEvery { gestor.autenticar(any(), any(), any(), any()) } returns resultado
        verificador.adjuntar(actividad)

        assertEquals(esperado, verificador.confirmar(AccionBiometrica.OTORGAR))
        coVerify { gestor.autenticar(actividad, "titulo", "subtitulo", "negativo") }
    }

    @Test
    fun `sin biometria utilizable no muestra el dialogo`() = runTest {
        every { gestor.disponibilidad() } returns Disponibilidad.SIN_HUELLAS_REGISTRADAS
        verificador.adjuntar(actividad)

        assertEquals(ConfirmacionBiometrica.NO_DISPONIBLE, verificador.confirmar(AccionBiometrica.OTORGAR))
        coVerify(exactly = 0) { gestor.autenticar(any(), any(), any(), any()) }
    }

    @Test
    fun `sin actividad en pantalla no se puede confirmar`() = runTest {
        assertEquals(ConfirmacionBiometrica.NO_DISPONIBLE, verificador.confirmar(AccionBiometrica.OTORGAR))

        verificador.adjuntar(actividad)
        verificador.soltar(actividad)
        assertEquals(ConfirmacionBiometrica.NO_DISPONIBLE, verificador.confirmar(AccionBiometrica.OTORGAR))
        coVerify(exactly = 0) { gestor.autenticar(any(), any(), any(), any()) }
    }

    @Test
    fun `soltar una actividad vieja no suelta la actual (rotacion)`() = runTest {
        val vieja = mockk<FragmentActivity>()
        coEvery { gestor.autenticar(any(), any(), any(), any()) } returns ResultadoBiometria.Exito
        verificador.adjuntar(vieja)
        verificador.adjuntar(actividad)

        verificador.soltar(vieja)

        assertEquals(ConfirmacionBiometrica.CONFIRMADA, verificador.confirmar(AccionBiometrica.OTORGAR))
        coVerify { gestor.autenticar(actividad, any(), any(), any()) }
    }

    companion object {
        @JvmStatic
        fun resultados(): List<Arguments> = listOf(
            Arguments.of(ResultadoBiometria.Exito, ConfirmacionBiometrica.CONFIRMADA),
            Arguments.of(ResultadoBiometria.Cancelado, ConfirmacionBiometrica.CANCELADA),
            Arguments.of(ResultadoBiometria.Bloqueado, ConfirmacionBiometrica.NO_DISPONIBLE),
            Arguments.of(ResultadoBiometria.Error("sensor"), ConfirmacionBiometrica.FALLIDA),
        )
    }
}
