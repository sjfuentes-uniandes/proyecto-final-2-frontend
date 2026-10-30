package com.solventa.feature.billetera

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.casos.ConsultarPoliza
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.Resultado
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

/** Detalle de la póliza [polizaId] (argumento de navegación) (AC2). Una ajena queda como no autorizada (AC3). */
class DetallePolizaViewModel(
    private val polizaId: String,
    private val consultarPoliza: ConsultarPoliza,
    private val gestorSesion: GestorSesion,
) : ViewModel() {
    private val _uiState = MutableStateFlow<DetallePolizaUiState>(DetallePolizaUiState.Cargando)
    val uiState: StateFlow<DetallePolizaUiState> = _uiState.asStateFlow()

    private val _eventos = Channel<EventoBilletera>(Channel.BUFFERED)
    val eventos: Flow<EventoBilletera> = _eventos.receiveAsFlow()

    private var carga: Job? = null

    init {
        cargar()
    }

    /** Un toque repetido mientras hay una carga en curso no hace nada. */
    fun reintentar() {
        if (carga?.isActive == true) return
        _uiState.value = DetallePolizaUiState.Cargando
        cargar()
    }

    private fun cargar() {
        carga = viewModelScope.launch {
            when (val resultado = consultarPoliza(polizaId)) {
                is Resultado.Exito -> _uiState.value = DetallePolizaUiState.Contenido(resultado.valor)
                is Resultado.Fallo -> when (resultado.fallo) {
                    FalloPolizas.SesionInvalida -> {
                        gestorSesion.cerrarSesion()
                        _eventos.send(EventoBilletera.IrALogin)
                    }
                    FalloPolizas.SinConexion -> _uiState.value = DetallePolizaUiState.SinConexion
                    FalloPolizas.NoAutorizada -> _uiState.value = DetallePolizaUiState.NoAutorizada
                    FalloPolizas.NoEncontrada -> _uiState.value = DetallePolizaUiState.NoEncontrada
                    FalloPolizas.ServicioNoDisponible, FalloPolizas.ErrorGenerico ->
                        _uiState.value = DetallePolizaUiState.Error
                }
            }
        }
    }
}
