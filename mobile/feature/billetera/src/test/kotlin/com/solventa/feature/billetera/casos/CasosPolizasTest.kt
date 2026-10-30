package com.solventa.feature.billetera.casos

import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

class CasosPolizasTest {
    private val repositorio = mockk<RepositorioPolizas>()

    @Test
    fun `ListarPolizas delega en el repositorio`() = runTest {
        coEvery { repositorio.listar() } returns Resultado.Exito(emptyList())

        assertEquals(Resultado.Exito(emptyList()), ListarPolizas(repositorio)())
    }

    @Test
    fun `ConsultarPoliza pasa solo el id y devuelve el fallo`() = runTest {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.NoAutorizada)

        assertEquals(Resultado.Fallo(FalloPolizas.NoAutorizada), ConsultarPoliza(repositorio)("id-1"))
        coVerify(exactly = 1) { repositorio.detalle("id-1") }
    }
}
