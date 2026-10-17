package com.solventa.feature.onboardingidentidad.verificacion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface EtapaCuenta {
    data object Inactiva : EtapaCuenta

    data object Procesando : EtapaCuenta

    /** Se pide el código del correo; [aviso] es el último resultado a mostrar (incorrecto, vencido, reenviado...). */
    data class EsperandoCodigo(val correo: String, val aviso: ResultadoCuenta? = null) : EtapaCuenta

    /** El paso falló; [motivo] dice cuál texto mostrar o a dónde navegar. */
    data class Fallida(val motivo: ResultadoCuenta) : EtapaCuenta

    data object Completada : EtapaCuenta
}

/** Estado de la creación de la cuenta; vive en el ViewModel para sobrevivir a rotaciones. */
class CuentaViewModel(private val crearCuenta: CrearCuenta) : ViewModel() {
    private val _etapa = MutableStateFlow<EtapaCuenta>(EtapaCuenta.Inactiva)
    val etapa: StateFlow<EtapaCuenta> = _etapa.asStateFlow()

    private var correo: String = ""

    fun registrar(correo: String, contrasena: String) {
        if (_etapa.value == EtapaCuenta.Procesando) return
        val reintentoDeVinculacion = (_etapa.value as? EtapaCuenta.Fallida)?.motivo == ResultadoCuenta.VinculacionPendiente
        this.correo = correo.trim()
        ejecutar {
            if (reintentoDeVinculacion) crearCuenta.reintentarVinculacion() else crearCuenta.registrar(correo, contrasena)
        }
    }

    fun confirmar(codigo: String) {
        if (_etapa.value == EtapaCuenta.Procesando || codigo.isBlank()) return
        ejecutar { crearCuenta.confirmar(correo, codigo) }
    }

    fun reenviarCodigo() {
        if (_etapa.value == EtapaCuenta.Procesando) return
        ejecutar { crearCuenta.reenviarCodigo(correo) }
    }

    /** Descarta el estado y la contraseña en memoria (al salir del registro o al repetir la verificación). */
    fun reiniciar() {
        crearCuenta.olvidarContrasena()
        _etapa.value = EtapaCuenta.Inactiva
    }

    private fun ejecutar(bloque: suspend () -> ResultadoCuenta) {
        val anterior = _etapa.value
        _etapa.value = EtapaCuenta.Procesando
        viewModelScope.launch {
            _etapa.value = when (val r = bloque()) {
                ResultadoCuenta.Completada -> EtapaCuenta.Completada
                ResultadoCuenta.CodigoRequerido -> EtapaCuenta.EsperandoCodigo(correo)
                ResultadoCuenta.CodigoReenviado, ResultadoCuenta.CodigoIncorrecto, ResultadoCuenta.CodigoVencido -> EtapaCuenta.EsperandoCodigo(correo, r)
                // Un fallo de red o de límite mientras se pide el código no debe sacar a la persona de esa pantalla.
                ResultadoCuenta.SinConexion, ResultadoCuenta.IntentosExcedidos, is ResultadoCuenta.Error ->
                    if (anterior is EtapaCuenta.EsperandoCodigo) EtapaCuenta.EsperandoCodigo(correo, r) else EtapaCuenta.Fallida(r)
                else -> EtapaCuenta.Fallida(r)
            }
        }
    }
}

class CuentaViewModelFactory(private val crearCuenta: CrearCuenta) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return CuentaViewModel(crearCuenta) as T
    }
}
