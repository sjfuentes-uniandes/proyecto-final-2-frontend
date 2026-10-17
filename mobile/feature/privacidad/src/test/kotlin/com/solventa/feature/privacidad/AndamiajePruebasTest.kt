package com.solventa.feature.privacidad

import app.cash.turbine.test
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

/**
 * Prueba de humo del andamiaje (PR 1.7): JUnit 5, MockK, Turbine y coroutines-test corren en este
 * módulo. No prueba comportamiento del módulo; se puede borrar cuando haya pruebas reales.
 */
class AndamiajePruebasTest {
    private interface Fuente {
        suspend fun valor(): Int
    }

    @Test
    fun `junit 5, mockk y turbine funcionan juntos`() = runTest {
        val fuente = mockk<Fuente>()
        coEvery { fuente.valor() } returns 42

        flow { emit(fuente.valor()) }.test {
            assertEquals(42, awaitItem())
            awaitComplete()
        }
        coVerify(exactly = 1) { fuente.valor() }
    }
}
