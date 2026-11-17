package com.solventa.feature.siniestros

import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros

data class SiniestrosUiState(
    val cargando: Boolean = true,
    val borradores: List<BorradorResumen> = emptyList(),
    val polizasElegibles: List<PolizaResumen> = emptyList(),
    val limites: LimitesSiniestros? = null,
    val errorCarga: FalloSiniestros? = null,
    val polizaSeleccionada: String? = null,
    val descripcion: String = "",
    val descripcionBloqueada: Boolean = false,
    val evidencias: List<EvidenciaTemporal> = emptyList(),
    val borradorActualId: String? = null,
    val enviando: Boolean = false,
    val falloFormulario: FalloSiniestros? = null,
    val cargandoDetalle: Boolean = false,
    val detalle: BorradorDetalle? = null,
)

sealed interface EventoSiniestros {
    data object IrALogin : EventoSiniestros
    data class AbrirDetalle(val borradorId: String) : EventoSiniestros
}

object EtiquetasSiniestros {
    const val PESTANA = "nav_siniestros"
    const val REPORTAR = "siniestros_reportar"
    const val DESCRIPCION = "siniestros_descripcion"
    const val LISTA_VACIA = "siniestros_lista_vacia"
    const val ERROR = "siniestros_error"
    fun borrador(id: String) = "siniestro_$id"
}
