package com.solventa.feature.siniestros

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros

class SiniestrosViewModelFactory(
    private val repositorio: RepositorioSiniestros,
    private val repositorioPolizas: RepositorioPolizas,
    private val almacen: AlmacenEvidencias,
    private val gestorSesion: GestorSesion,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        require(modelClass.isAssignableFrom(SiniestrosViewModel::class.java))
        return SiniestrosViewModel(repositorio, repositorioPolizas, almacen, gestorSesion) as T
    }
}
