package com.solventa.feature.billetera.datos

import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.ResultadoPoliza
import com.solventa.core.network.ResultadoPolizas
import com.solventa.core.network.modelo.CoberturaDto
import com.solventa.core.network.modelo.CredencialDto
import com.solventa.core.network.modelo.PolizaDetalleDto
import com.solventa.core.network.modelo.PolizaResumenDto
import com.solventa.core.network.modelo.ResumenCoberturaDto
import com.solventa.core.network.modelo.VigenciaDto
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.Resultado
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class RepositorioPolizasRedTest {
    private val cliente = mockk<BffMovilCliente>()
    private val repositorio = RepositorioPolizasRed(cliente)

    private val vigencia = VigenciaDto("2026-01-01", "2027-01-01")
    private val resumen = PolizaResumenDto(
        polizaId = "id-1", numero = "P-1", estado = "ACTIVA", producto = "Auto", ramo = "Vehículos",
        vigencia = vigencia, vigente = true,
        resumenCobertura = ResumenCoberturaDto("300000000.00", "COP", 3),
    )
    private val detalle = PolizaDetalleDto(
        numero = "P-1", estado = "ACTIVA", producto = "Auto", ramo = "Vehículos", vigencia = vigencia,
        vigente = false, prima = "1200000.50", sumaAsegurada = "300000000.00", moneda = "COP",
        periodicidad = "MENSUAL", emitidaEn = "2026-01-01T10:00:00Z",
        coberturas = listOf(CoberturaDto("RC", "Responsabilidad civil", true)),
        credencial = CredencialDto("C-1", "abcdef0123456789", "f-1", vigencia),
    )

    @Test
    fun `mapea la lista a dominio con BigDecimal y LocalDate`() = runTest {
        coEvery { cliente.consultarPolizas() } returns ResultadoPolizas.Exito(listOf(resumen))

        val resultado = repositorio.listar()

        assertIs<Resultado.Exito<*>>(resultado)
        val poliza = (resultado.valor as List<*>).single() as com.solventa.feature.billetera.dominio.PolizaResumen
        assertEquals(BigDecimal("300000000.00"), poliza.resumenCobertura.sumaAsegurada)
        assertEquals(LocalDate.of(2027, 1, 1), poliza.vigencia.hasta)
        assertEquals("id-1", poliza.polizaId)
        assertEquals(3, poliza.resumenCobertura.totalCoberturas)
    }

    @Test
    fun `lista vacia es Exito vacio`() = runTest {
        coEvery { cliente.consultarPolizas() } returns ResultadoPolizas.Exito(emptyList())

        val resultado = repositorio.listar()

        assertIs<Resultado.Exito<*>>(resultado)
        assertTrue((resultado.valor as List<*>).isEmpty())
    }

    @Test
    fun `mapea el detalle completo a dominio`() = runTest {
        coEvery { cliente.consultarPoliza("id-1") } returns ResultadoPoliza.Exito(detalle)

        val resultado = repositorio.detalle("id-1")

        assertIs<Resultado.Exito<com.solventa.feature.billetera.dominio.PolizaDetalle>>(resultado)
        val poliza = resultado.valor
        assertEquals(BigDecimal("1200000.50"), poliza.prima)
        assertEquals(OffsetDateTime.parse("2026-01-01T10:00:00Z"), poliza.emitidaEn)
        assertEquals(false, poliza.vigente)
        assertEquals(true, poliza.coberturas.single().obligatoria)
        assertEquals("abcdef0123456789", poliza.credencial.huella)
        assertEquals(LocalDate.of(2026, 1, 1), poliza.credencial.vigencia.desde)
    }

    @Test
    fun `monto invalido es ErrorGenerico`() = runTest {
        coEvery { cliente.consultarPoliza("id-1") } returns ResultadoPoliza.Exito(detalle.copy(prima = "abc"))
        assertEquals(Resultado.Fallo(FalloPolizas.ErrorGenerico), repositorio.detalle("id-1"))

        coEvery { cliente.consultarPolizas() } returns ResultadoPolizas.Exito(
            listOf(resumen.copy(resumenCobertura = ResumenCoberturaDto("", "COP", 1))),
        )
        assertEquals(Resultado.Fallo(FalloPolizas.ErrorGenerico), repositorio.listar())
    }

    @Test
    fun `fecha invalida es ErrorGenerico`() = runTest {
        coEvery { cliente.consultarPoliza("id-1") } returns ResultadoPoliza.Exito(detalle.copy(emitidaEn = "ayer"))
        assertEquals(Resultado.Fallo(FalloPolizas.ErrorGenerico), repositorio.detalle("id-1"))

        coEvery { cliente.consultarPolizas() } returns ResultadoPolizas.Exito(
            listOf(resumen.copy(vigencia = VigenciaDto("2026-02-30", "2027-01-01"))),
        )
        assertEquals(Resultado.Fallo(FalloPolizas.ErrorGenerico), repositorio.listar())
    }

    @Test
    fun `traduce cada resultado de la lista`() = runTest {
        val casos = mapOf(
            ResultadoPolizas.NoAutenticado("m") to FalloPolizas.SesionInvalida,
            ResultadoPolizas.ClienteNoEncontrado("m") to FalloPolizas.SesionInvalida,
            ResultadoPolizas.PolizaNoAutorizada to FalloPolizas.NoAutorizada,
            ResultadoPolizas.PolizaNoEncontrada("m") to FalloPolizas.NoEncontrada,
            ResultadoPolizas.SolicitudInvalida("m") to FalloPolizas.ErrorGenerico,
            ResultadoPolizas.ServicioNoDisponible("m") to FalloPolizas.ServicioNoDisponible,
            ResultadoPolizas.SinConexion("m") to FalloPolizas.SinConexion,
            ResultadoPolizas.ErrorDesconocido("m") to FalloPolizas.ErrorGenerico,
        )
        casos.forEach { (entrada, esperado) ->
            coEvery { cliente.consultarPolizas() } returns entrada
            assertEquals(Resultado.Fallo(esperado), repositorio.listar(), "con $entrada")
        }
    }

    @Test
    fun `traduce cada resultado del detalle`() = runTest {
        val casos = mapOf(
            ResultadoPoliza.NoAutenticado("m") to FalloPolizas.SesionInvalida,
            ResultadoPoliza.ClienteNoEncontrado("m") to FalloPolizas.SesionInvalida,
            ResultadoPoliza.PolizaNoAutorizada to FalloPolizas.NoAutorizada,
            ResultadoPoliza.PolizaNoEncontrada("m") to FalloPolizas.NoEncontrada,
            ResultadoPoliza.SolicitudInvalida("m") to FalloPolizas.ErrorGenerico,
            ResultadoPoliza.ServicioNoDisponible("m") to FalloPolizas.ServicioNoDisponible,
            ResultadoPoliza.SinConexion("m") to FalloPolizas.SinConexion,
            ResultadoPoliza.ErrorDesconocido("m") to FalloPolizas.ErrorGenerico,
        )
        casos.forEach { (entrada, esperado) ->
            coEvery { cliente.consultarPoliza("id-1") } returns entrada
            assertEquals(Resultado.Fallo(esperado), repositorio.detalle("id-1"), "con $entrada")
        }
    }
}
