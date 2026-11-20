package com.solventa.feature.siniestros

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.ProveedorUbicacion
import com.solventa.feature.siniestros.dominio.ImportadorEvidencias
import com.solventa.feature.siniestros.dominio.AlmacenPendientes

class SiniestrosViewModelFactory(
    private val repositorio: RepositorioSiniestros,
    private val repositorioPolizas: RepositorioPolizas,
    private val almacen: AlmacenEvidencias,
    private val gestorSesion: GestorSesion,
    private val proveedorUbicacion: ProveedorUbicacion? = null,
    private val importadorEvidencias: ImportadorEvidencias? = null,
    private val almacenPendientes: AlmacenPendientes,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        require(modelClass.isAssignableFrom(SiniestrosViewModel::class.java))
        return SiniestrosViewModel(repositorio, repositorioPolizas, almacen, gestorSesion, proveedorUbicacion = proveedorUbicacion, importadorEvidencias = importadorEvidencias, almacenPendientes = almacenPendientes) as T
    }
}
