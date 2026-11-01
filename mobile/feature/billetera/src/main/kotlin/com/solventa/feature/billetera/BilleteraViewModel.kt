package com.solventa.feature.billetera

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.casos.ListarPolizas
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

/** Lista de pólizas del cliente autenticado (AC1). Carga al crearse; sin clienteId: lo resuelve el BFF. */
class BilleteraViewModel(
    private val listarPolizas: ListarPolizas,
    private val gestorSesion: GestorSesion,
) : ViewModel() {
    private val _uiState = MutableStateFlow<BilleteraUiState>(BilleteraUiState.Cargando)
    val uiState: StateFlow<BilleteraUiState> = _uiState.asStateFlow()

    private val _eventos = Channel<EventoBilletera>(Channel.BUFFERED)
    val eventos: Flow<EventoBilletera> = _eventos.receiveAsFlow()

    private var carga: Job? = null

    init {
        cargar()
    }

    /** Un toque repetido mientras hay una carga en curso no hace nada. */
    fun reintentar() {
        if (carga?.isActive == true) return
        _uiState.value = BilleteraUiState.Cargando
        cargar()
    }

    private fun cargar() {
        carga = viewModelScope.launch {
            when (val resultado = listarPolizas()) {
                is Resultado.Exito -> _uiState.value = if (resultado.valor.isEmpty()) {
                    BilleteraUiState.Vacia
                } else {
                    BilleteraUiState.Contenido(resultado.valor)
                }
                is Resultado.Fallo -> when (resultado.fallo) {
                    FalloPolizas.SesionInvalida -> {
                        gestorSesion.cerrarSesion()
                        _eventos.send(EventoBilletera.IrALogin)
                    }
                    FalloPolizas.SinConexion -> _uiState.value = BilleteraUiState.SinConexion
                    // La lista no tiene NoAutorizada ni NoEncontrada: cualquier otro fallo es un error reintentable.
                    else -> _uiState.value = BilleteraUiState.Error
                }
            }
        }
    }
}
