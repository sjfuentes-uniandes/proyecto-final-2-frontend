package com.solventa.app

import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado
import com.solventa.feature.billetera.dominio.FalloPolizas
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class VigilantePolizasSimuladoTest {
    private class Repo(var respuesta: Resultado<List<PolizaResumen>>) : RepositorioPolizas {
        override suspend fun listar() = respuesta

        override suspend fun detalle(polizaId: String): Resultado<PolizaDetalle> = error("no usado")
    }

    private class Memoria : PolizasConocidas {
        var ids: Set<String>? = null

        override fun leer() = ids

        override fun guardar(ids: Set<String>) {
            this.ids = ids
        }
    }

    private fun poliza(id: String) = mockk<PolizaResumen>().also {
        io.mockk.every { it.polizaId } returns id
    }

    @Test
    fun `la primera lectura no avisa y la poliza nueva si`() = runTest {
        val repo = Repo(Resultado.Exito(listOf(poliza("a"))))
        val avisos = mutableListOf<String>()
        val vigilante = VigilantePolizasSimulado(repo, Memoria(), { avisos += it })

        vigilante.revisar()
        assertEquals(emptyList<String>(), avisos)

        repo.respuesta = Resultado.Exito(listOf(poliza("a"), poliza("b")))
        vigilante.revisar()
        vigilante.revisar()
        assertEquals(listOf("b"), avisos)
    }

    @Test
    fun `un fallo de red no avisa ni cambia la linea base`() = runTest {
        val memoria = Memoria()
        val vigilante = VigilantePolizasSimulado(
            Repo(Resultado.Fallo(FalloPolizas.SinConexion)),
            memoria,
            { error("no debe avisar") },
        )

        vigilante.revisar()

        assertEquals(null, memoria.ids)
    }
}
