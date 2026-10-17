package com.solventa.feature.privacidad

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.feature.privacidad.casos.ListarConsentimientos
import com.solventa.feature.privacidad.casos.ObtenerTextoVigente
import com.solventa.feature.privacidad.casos.OtorgarConsentimiento
import com.solventa.feature.privacidad.casos.VerDetalleConsentimiento
import com.solventa.feature.privacidad.dominio.GeneradorClave
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Orquesta el panel de Privacidad: lista, detalle, texto vigente y otorgamiento (HU-M08).
 *
 * Idempotencia (AC4): cada intento de otorgar tiene una `Idempotency-Key` propia, que se genera
 * al confirmar y se reutiliza mientras el cliente reintente la misma solicitud tras un fallo
 * reintentable (sin red, servicio caído, respuesta inválida o biometría no confirmada). Así,
 * si la primera respuesta se perdió, el servidor devuelve el mismo consentimiento. Tras un
 * éxito o un rechazo definitivo, el siguiente intento lleva una clave nueva; una solicitud
 * distinta también.
 */
class PrivacidadViewModel(
    private val listarConsentimientos: ListarConsentimientos,
    private val verDetalle: VerDetalleConsentimiento,
    private val obtenerTextoVigente: ObtenerTextoVigente,
    private val otorgarConsentimiento: OtorgarConsentimiento,
    private val generadorClave: GeneradorClave = GeneradorClave { UUID.randomUUID().toString() },
) : ViewModel() {
    private val _uiState = MutableStateFlow(PrivacidadUiState())
    val uiState: StateFlow<PrivacidadUiState> = _uiState.asStateFlow()

    private data class Intento(val solicitud: SolicitudOtorgamiento, val clave: String)

    private var intento: Intento? = null

    fun cargarConsentimientos() {
        _uiState.update { it.copy(consentimientos = Carga.Cargando) }
        viewModelScope.launch {
            val carga = aCarga(listarConsentimientos())
            _uiState.update { it.copy(consentimientos = carga) }
        }
    }

    fun verConsentimiento(id: String) {
        _uiState.update { it.copy(detalle = Carga.Cargando) }
        viewModelScope.launch {
            val carga = aCarga(verDetalle(id))
            _uiState.update { it.copy(detalle = carga) }
        }
    }

    /** `idioma`: es-CO o en-US, según el de la app. */
    fun cargarTextoVigente(idioma: String) {
        _uiState.update { it.copy(texto = Carga.Cargando) }
        viewModelScope.launch {
            val carga = aCarga(obtenerTextoVigente(idioma))
            _uiState.update { it.copy(texto = carga) }
        }
    }

    /** El cliente confirmó explícitamente (AC1). Un toque repetido mientras va en curso no hace nada. */
    fun otorgar(solicitud: SolicitudOtorgamiento) {
        if (!_uiState.value.puedeOtorgar(solicitud.permiso)) return
        val actual = intento?.takeIf { it.solicitud == solicitud }
            ?: Intento(solicitud, generadorClave.nueva())
        intento = actual
        _uiState.update { it.copy(otorgamiento = EstadoOtorgamiento.EnCurso) }
        viewModelScope.launch {
            when (val resultado = otorgarConsentimiento(actual.solicitud, actual.clave)) {
                is Resultado.Exito -> {
                    intento = null
                    _uiState.update {
                        it.copy(
                            otorgamiento = EstadoOtorgamiento.Otorgado(
                                resultado.valor.consentimiento,
                                resultado.valor.repeticion,
                            ),
                        )
                    }
                    cargarConsentimientos()
                }
                is Resultado.Fallo -> {
                    if (!resultado.fallo.reintentable) intento = null
                    _uiState.update { it.copy(otorgamiento = EstadoOtorgamiento.Fallido(resultado.fallo)) }
                }
            }
        }
    }

    /** Repite el último intento con su misma clave; sin intento pendiente no hace nada. */
    fun reintentarOtorgamiento() {
        intento?.let { otorgar(it.solicitud) }
    }

    /** Cierra el resultado (comprobante o modal de error). El intento pendiente se conserva. */
    fun descartarOtorgamiento() {
        _uiState.update { it.copy(otorgamiento = EstadoOtorgamiento.Inactivo) }
    }

    private fun <T> aCarga(resultado: Resultado<T>): Carga<T> = when (resultado) {
        is Resultado.Exito -> Carga.Lista(resultado.valor)
        is Resultado.Fallo -> Carga.Error(resultado.fallo)
    }
}
