package com.solventa.feature.onboardingidentidad.verificacion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.core.network.ResultadoVerificacionRegistro
import com.solventa.feature.onboardingidentidad.captura.FlujoCaptura
import com.solventa.feature.onboardingidentidad.captura.ObservacionFrame
import com.solventa.feature.onboardingidentidad.captura.PasoCaptura
import com.solventa.feature.onboardingidentidad.captura.SelfieEnMemoria
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Orquesta la verificación de identidad: permiso de cámara, captura con prueba de vida, envío y
 * resultado. No usa tipos de Android; la UI convierte el cuadro de la cámara en un
 * [SelfieEnMemoria] y se lo entrega.
 *
 * La selfie solo vive en memoria y este ViewModel es su dueño: la borra cuando el resultado es
 * definitivo, al cancelar y al destruirse (AC4). Solo se conserva tras una interrupción técnica,
 * para reintentar el envío sin volver a capturar (AC3).
 *
 * Debe usarse desde el hilo principal: [FlujoCaptura] no es seguro entre hilos.
 */
class VerificacionIdentidadViewModel(
    private val verificarIdentidad: VerificarIdentidad,
    private val flujo: FlujoCaptura = FlujoCaptura(),
) : ViewModel() {
    private val _etapa = MutableStateFlow<EtapaVerificacion>(EtapaVerificacion.PermisoPendiente)
    val etapa: StateFlow<EtapaVerificacion> = _etapa.asStateFlow()

    private var selfie: SelfieEnMemoria? = null
    private var capturaSolicitada = false
    private var trabajoEnvio: Job? = null

    /** La UI informa si la cámara está permitida (al abrir la pantalla y tras pedir el permiso). */
    fun onPermisoCamara(concedido: Boolean) {
        when (_etapa.value) {
            EtapaVerificacion.PermisoPendiente, EtapaVerificacion.PermisoDenegado ->
                if (concedido) iniciarCaptura() else _etapa.value = EtapaVerificacion.PermisoDenegado
            else -> Unit
        }
    }

    /**
     * Procesa un cuadro de la cámara y devuelve true solo una vez: cuando ese cuadro es el que debe
     * capturarse. La UI responde entregando el resultado a [onSelfieCapturada].
     */
    fun onFrame(frame: ObservacionFrame): Boolean {
        if (_etapa.value !is EtapaVerificacion.Capturando) return false
        val paso = flujo.procesar(frame)
        _etapa.value = EtapaVerificacion.Capturando(paso)
        if (paso is PasoCaptura.Completado && !capturaSolicitada) {
            capturaSolicitada = true
            return true
        }
        return false
    }

    /** La UI entrega la selfie ya codificada, o null si no cupo en el límite del backend. */
    fun onSelfieCapturada(nueva: SelfieEnMemoria?) {
        if (_etapa.value !is EtapaVerificacion.Capturando || !capturaSolicitada) {
            // Llegó tarde (la persona canceló): no se queda con evidencia que nadie va a usar.
            nueva?.limpiar()
            return
        }
        if (nueva == null) {
            _etapa.value = EtapaVerificacion.CapturaInvalida(MotivoCapturaInvalida.OTRO)
            return
        }
        selfie = nueva
        enviar()
    }

    /** Tras una interrupción reenvía la misma selfie; en cualquier otro caso vuelve a capturar. */
    fun reintentar() {
        val guardada = selfie
        if (_etapa.value is EtapaVerificacion.Interrumpida && guardada != null && !guardada.estaLimpia) {
            enviar()
        } else {
            repetirCaptura()
        }
    }

    fun repetirCaptura() {
        if (_etapa.value is EtapaVerificacion.Enviando) return
        limpiarSelfie()
        iniciarCaptura()
    }

    fun cancelar() {
        trabajoEnvio?.cancel()
        limpiarSelfie()
        flujo.reiniciar()
        _etapa.value = EtapaVerificacion.Cancelada
    }

    /** Vuelve al inicio (permiso pendiente) para empezar de cero, por ejemplo al reabrir la captura. */
    fun reiniciar() {
        trabajoEnvio?.cancel()
        limpiarSelfie()
        flujo.reiniciar()
        capturaSolicitada = false
        _etapa.value = EtapaVerificacion.PermisoPendiente
    }

    /** La cámara frontal no se pudo abrir (no existe o falló al iniciar). */
    fun onCamaraNoDisponible() {
        if (_etapa.value is EtapaVerificacion.Capturando) {
            _etapa.value = EtapaVerificacion.ErrorInesperado(correlationId = null)
        }
    }

    override fun onCleared() {
        trabajoEnvio?.cancel()
        limpiarSelfie()
    }

    private fun iniciarCaptura() {
        flujo.reiniciar()
        capturaSolicitada = false
        _etapa.value = EtapaVerificacion.Capturando()
    }

    private fun enviar() {
        val aEnviar = selfie ?: return
        _etapa.value = EtapaVerificacion.Enviando
        trabajoEnvio = viewModelScope.launch {
            // La captura solo se pide tras cumplir la prueba de vida, por eso va como completada.
            val resultado = verificarIdentidad(aEnviar, pruebaDeVidaCompletada = true)
            aplicar(resultado)
        }
    }

    private fun aplicar(resultado: ResultadoVerificacionRegistro) {
        _etapa.value = when (resultado) {
            is ResultadoVerificacionRegistro.Verificada -> definitivo(EtapaVerificacion.Aprobada(resultado.clienteId))
            is ResultadoVerificacionRegistro.CapturaInvalida ->
                definitivo(EtapaVerificacion.CapturaInvalida(MotivoCapturaInvalida.desde(resultado.motivo)))
            is ResultadoVerificacionRegistro.Rechazada ->
                definitivo(EtapaVerificacion.Rechazada(MotivoRechazo.desde(resultado.motivo)))
            is ResultadoVerificacionRegistro.ServicioNoDisponible -> EtapaVerificacion.Interrumpida(resultado.correlationId)
            is ResultadoVerificacionRegistro.DemasiadosIntentos -> EtapaVerificacion.Interrumpida(resultado.correlationId)
            ResultadoVerificacionRegistro.SinConexion -> EtapaVerificacion.Interrumpida(correlationId = null)
            is ResultadoVerificacionRegistro.CorreoDistinto -> definitivo(EtapaVerificacion.CorreoDistinto)
            is ResultadoVerificacionRegistro.YaVinculado -> definitivo(EtapaVerificacion.CuentaExistente)
            is ResultadoVerificacionRegistro.SolicitudInvalida -> definitivo(EtapaVerificacion.ErrorInesperado(resultado.correlationId))
            is ResultadoVerificacionRegistro.ErrorDesconocido -> definitivo(EtapaVerificacion.ErrorInesperado(resultado.correlationId))
        }
    }

    /** Un resultado definitivo cierra la verificación: la selfie ya no tiene uso y se borra. */
    private fun definitivo(etapa: EtapaVerificacion): EtapaVerificacion {
        limpiarSelfie()
        return etapa
    }

    private fun limpiarSelfie() {
        selfie?.limpiar()
        selfie = null
    }
}
