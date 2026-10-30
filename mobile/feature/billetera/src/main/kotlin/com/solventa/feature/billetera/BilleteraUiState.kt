package com.solventa.feature.billetera

import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.PolizaResumen

/** Estado de la lista de pólizas (billetera). */
sealed interface BilleteraUiState {
    data object Cargando : BilleteraUiState

    data class Contenido(val polizas: List<PolizaResumen>) : BilleteraUiState

    data object Vacia : BilleteraUiState

    /** Reintentable. */
    data object SinConexion : BilleteraUiState

    /** Reintentable. */
    data object Error : BilleteraUiState
}

/** Estado del detalle de una póliza (carné digital). */
sealed interface DetallePolizaUiState {
    data object Cargando : DetallePolizaUiState

    data class Contenido(val poliza: PolizaDetalle) : DetallePolizaUiState

    /** Reintentable. */
    data object SinConexion : DetallePolizaUiState

    /** Reintentable. */
    data object Error : DetallePolizaUiState

    /** 403 POLIZA_NO_AUTORIZADA (AC3): a propósito no lleva ningún dato de la póliza. */
    data object NoAutorizada : DetallePolizaUiState

    data object NoEncontrada : DetallePolizaUiState
}

/** Eventos de una sola vez hacia la navegación. */
sealed interface EventoBilletera {
    /** La sesión ya no sirve y se cerró: volver al login. */
    data object IrALogin : EventoBilletera
}
