package com.solventa.feature.billetera

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.casos.ConsultarPoliza
import com.solventa.feature.billetera.casos.ListarPolizas
import com.solventa.feature.billetera.dominio.RepositorioPolizas

/** Fábrica manual (no hay Hilt/Koin en el proyecto) para que [BilleteraViewModel] sobreviva rotaciones. */
class BilleteraViewModelFactory(
    private val repositorio: RepositorioPolizas,
    private val gestorSesion: GestorSesion,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return BilleteraViewModel(ListarPolizas(repositorio), gestorSesion) as T
    }
}

/** Fábrica de [DetallePolizaViewModel]; [polizaId] llega por argumento de navegación. */
class DetallePolizaViewModelFactory(
    private val polizaId: String,
    private val repositorio: RepositorioPolizas,
    private val gestorSesion: GestorSesion,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return DetallePolizaViewModel(polizaId, ConsultarPoliza(repositorio), gestorSesion) as T
    }
}
