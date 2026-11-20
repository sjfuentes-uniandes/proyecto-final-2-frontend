package com.solventa.feature.siniestros.casos

import com.solventa.feature.siniestros.dominio.Borrador
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CasosSiniestrosTest {
    private val repositorio = mockk<RepositorioSiniestros>()

    @Test
    fun `recorta descripcion y reusa la clave de idempotencia recibida`() = runBlocking {
        val borrador = Borrador("borrador", "poliza", "ABIERTO")
        coEvery { repositorio.crearBorrador("poliza", "Choque", "clave-existente") } returns Resultado.Exito(borrador)

        val resultado = CrearBorradorSiniestro(repositorio)(
            polizaId = "poliza",
            descripcion = "  Choque  ",
            claveIdempotencia = "clave-existente",
        )

        assertEquals(Resultado.Exito(borrador), resultado)
        coVerify(exactly = 1) { repositorio.crearBorrador("poliza", "Choque", "clave-existente") }
    }

    @Test
    fun `rechaza descripcion vacia y demasiado larga sin llamar al repositorio`() = runBlocking {
        val caso = CrearBorradorSiniestro(repositorio)

        assertEquals(
            Resultado.Fallo(FalloSiniestros.DescripcionObligatoria),
            caso("poliza", "   "),
        )
        assertEquals(
            Resultado.Fallo(FalloSiniestros.DescripcionDemasiadoLarga),
            caso("poliza", "x".repeat(2001)),
        )
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }
}
