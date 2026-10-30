package com.solventa.feature.billetera.dominio

import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime

data class Vigencia(val desde: LocalDate, val hasta: LocalDate)

data class ResumenCobertura(
    val sumaAsegurada: BigDecimal,
    val moneda: String,
    val totalCoberturas: Int,
)

data class PolizaResumen(
    val polizaId: String,
    val numero: String,
    val estado: String,
    val producto: String,
    val ramo: String,
    val vigencia: Vigencia,
    val vigente: Boolean,
    val resumenCobertura: ResumenCobertura,
)

data class Cobertura(val codigo: String, val nombre: String, val obligatoria: Boolean)

data class Credencial(
    val numero: String,
    val huella: String,
    val firmaId: String,
    val vigencia: Vigencia,
)

data class PolizaDetalle(
    val numero: String,
    val estado: String,
    val producto: String,
    val ramo: String,
    val vigencia: Vigencia,
    val vigente: Boolean,
    val prima: BigDecimal,
    val sumaAsegurada: BigDecimal,
    val moneda: String,
    val periodicidad: String,
    val emitidaEn: OffsetDateTime,
    val coberturas: List<Cobertura>,
    val credencial: Credencial,
)
