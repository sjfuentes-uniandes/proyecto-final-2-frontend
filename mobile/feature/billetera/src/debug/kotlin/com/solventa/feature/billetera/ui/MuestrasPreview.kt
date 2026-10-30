package com.solventa.feature.billetera.ui

import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.Credencial
import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Vigencia
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime

/** Datos sintéticos de las previews. Solo variante debug (excluido de Kover). */
internal object MuestrasPreview {
    private val vigencia = Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"))
    private val vencida = Vigencia(LocalDate.parse("2024-01-01"), LocalDate.parse("2024-12-31"))

    val activa = PolizaResumen(
        polizaId = "11111111-1111-1111-1111-111111111111",
        numero = "POL-000123",
        estado = "ACTIVA",
        producto = "Seguro de Vida",
        ramo = "Personas",
        vigencia = vigencia,
        vigente = true,
        resumenCobertura = ResumenCobertura(BigDecimal("300000000"), "COP", 3),
    )

    val vencidaResumen = activa.copy(
        polizaId = "22222222-2222-2222-2222-222222222222",
        numero = "POL-000099",
        estado = "VENCIDA",
        producto = "Seguro de Auto",
        ramo = "Vehículos",
        vigencia = vencida,
        vigente = false,
        resumenCobertura = ResumenCobertura(BigDecimal("80000000"), "COP", 1),
    )

    val detalle = PolizaDetalle(
        numero = "POL-000123",
        estado = "ACTIVA",
        producto = "Seguro de Vida",
        ramo = "Personas",
        vigencia = vigencia,
        vigente = true,
        prima = BigDecimal("1250000.50"),
        sumaAsegurada = BigDecimal("300000000"),
        moneda = "COP",
        periodicidad = "MENSUAL",
        emitidaEn = OffsetDateTime.parse("2026-01-01T10:00:00-05:00"),
        coberturas = listOf(
            Cobertura("MUERTE", "Muerte por cualquier causa", true),
            Cobertura("INCAP", "Incapacidad total y permanente", false),
        ),
        credencial = Credencial("CRED-0001-2026", "a1b2c3d4e5f6a7b8c9d0", "FIRMA-7788", vigencia),
    )
}
