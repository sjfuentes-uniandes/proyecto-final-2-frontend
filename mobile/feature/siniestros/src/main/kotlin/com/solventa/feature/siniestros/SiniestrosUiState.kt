package com.solventa.feature.siniestros

import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.Vigencia
import com.solventa.feature.siniestros.dominio.EnvioSiniestro
import com.solventa.feature.siniestros.dominio.SiniestroResumen
import com.solventa.feature.siniestros.dominio.SiniestroDetalle
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.ArchivoEvidencia
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import com.solventa.feature.siniestros.dominio.UbicacionReporte
import com.solventa.feature.siniestros.dominio.MotivoSinUbicacion
import com.solventa.feature.siniestros.dominio.ResumenPendienteLocal

data class SiniestrosUiState(
    val cargando: Boolean = true,
    val borradores: List<BorradorResumen> = emptyList(),
    val pendientesLocales: List<ResumenPendienteLocal> = emptyList(),
    val errorPendientesLocales: FalloSiniestros? = null,
    val pendienteLocalId: String? = null,
    val pendienteGuardadoLocal: Boolean = false,
    val limpiezaPendienteFallida: Boolean = false,
    val polizasElegibles: List<PolizaResumen> = emptyList(),
    val errorValidacionPolizas: Boolean = false,
    val limites: LimitesSiniestros? = null,
    val errorCarga: FalloSiniestros? = null,
    val polizaSeleccionada: String? = null,
    val descripcion: String = "",
    val descripcionBloqueada: Boolean = false,
    val evidencias: List<EvidenciaTemporal> = emptyList(),
    val borradorActualId: String? = null,
    val enviando: Boolean = false,
    val importandoEvidencia: Boolean = false,
    val falloFormulario: FalloSiniestros? = null,
    val cargandoDetalle: Boolean = false,
    val detalle: BorradorDetalle? = null,
    val coberturas: List<Cobertura> = emptyList(),
    val vigenciaEvento: Vigencia? = null,
    val cargandoCoberturas: Boolean = false,
    val errorCoberturas: FalloSiniestros? = null,
    val causa: String? = null,
    val fechaEvento: String = "",
    val historial: List<SiniestroResumen> = emptyList(),
    val cargandoHistorial: Boolean = false,
    val errorHistorial: FalloSiniestros? = null,
    val siguienteCursor: String? = null,
    val reporte: SiniestroDetalle? = null,
    val envioConfirmado: EnvioSiniestro? = null,
    val numeroPolizaReporte: String? = null,
    val cargandoNumeroPolizaReporte: Boolean = false,
    val descargandoEvidencia: String? = null,
    val falloAccesoEvidencia: FalloSiniestros? = null,
    val archivoPorGuardar: ArchivoEvidencia? = null,
    val evidenciaGuardada: Boolean = false,
    val ubicacion: UbicacionReporte? = null,
    val ubicacionPendiente: UbicacionCapturada? = null,
    val guardandoUbicacion: Boolean = false,
    val obteniendoUbicacion: Boolean = false,
    val falloUbicacion: FalloSiniestros? = null,
    val motivoSinUbicacion: MotivoSinUbicacion? = null,
    val borradorGuardado: Boolean = false,
)

fun SiniestrosUiState.puedeEnviarPorUbicacion(): Boolean {
    val reglas = limites?.reglasUbicacion ?: return false
    return !guardandoUbicacion && !obteniendoUbicacion && ubicacionPendiente == null &&
        (!reglas.requiere(causa) || ubicacion?.esConfiable(reglas) == true)
}

sealed interface EventoSiniestros {
    data object IrALogin : EventoSiniestros
    data class AbrirDetalle(val borradorId: String) : EventoSiniestros
    data class ReporteEnviado(val siniestroId: String) : EventoSiniestros
    data class EvidenciaLista(val siniestroId: String, val archivo: ArchivoEvidencia, val guardar: Boolean) : EventoSiniestros
    data object SolicitarUbicacion : EventoSiniestros
    data object AbrirPendienteLocal : EventoSiniestros
}

object EtiquetasSiniestros {
    const val PESTANA = "nav_siniestros"
    const val REPORTAR = "siniestros_reportar"
    const val DESCRIPCION = "siniestros_descripcion"
    const val LISTA_VACIA = "siniestros_lista_vacia"
    const val ERROR = "siniestros_error"
    const val CAUSA = "siniestros_causa"
    const val FECHA_EVENTO = "siniestros_fecha_evento"
    const val ENVIAR = "siniestros_enviar"
    fun borrador(id: String) = "siniestro_$id"
}
