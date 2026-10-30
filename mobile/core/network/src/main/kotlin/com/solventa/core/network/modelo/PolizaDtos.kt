package com.solventa.core.network.modelo

import kotlinx.serialization.Serializable

/** HU-M10 (contrato bff-movil.yaml). Montos y fechas viajan como texto; el dominio los convierte. */
@Serializable
data class VigenciaDto(val desde: String, val hasta: String)

@Serializable
data class ResumenCoberturaDto(
    val sumaAsegurada: String,
    val moneda: String,
    val totalCoberturas: Int,
)

@Serializable
data class PolizaResumenDto(
    val polizaId: String,
    val numero: String,
    val estado: String,
    val producto: String,
    val ramo: String,
    val vigencia: VigenciaDto,
    val vigente: Boolean,
    val resumenCobertura: ResumenCoberturaDto,
)

@Serializable
data class CoberturaDto(
    val codigo: String,
    val nombre: String,
    val obligatoria: Boolean,
)

@Serializable
data class CredencialDto(
    val numero: String,
    val huella: String,
    val firmaId: String,
    val vigencia: VigenciaDto,
)

/** No trae `polizaId`: el identificador va en la ruta. */
@Serializable
data class PolizaDetalleDto(
    val numero: String,
    val estado: String,
    val producto: String,
    val ramo: String,
    val vigencia: VigenciaDto,
    val vigente: Boolean,
    val prima: String,
    val sumaAsegurada: String,
    val moneda: String,
    val periodicidad: String,
    val emitidaEn: String,
    val coberturas: List<CoberturaDto>,
    val credencial: CredencialDto,
)
