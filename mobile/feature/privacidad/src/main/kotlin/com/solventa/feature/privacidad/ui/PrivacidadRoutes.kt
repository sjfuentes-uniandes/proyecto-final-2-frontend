package com.solventa.feature.privacidad.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalConfiguration
import com.solventa.feature.privacidad.Carga
import com.solventa.feature.privacidad.EstadoOtorgamiento
import com.solventa.feature.privacidad.EstadoRevocacion
import com.solventa.feature.privacidad.PrivacidadViewModel
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Permiso

/** Conecta [ListaPermisosScreen] con [PrivacidadViewModel]; recarga la lista cada vez que se muestra. */
@Composable
fun PrivacidadListaRoute(viewModel: PrivacidadViewModel, onAbrirPermiso: (Permiso) -> Unit) {
    val estado by viewModel.uiState.collectAsState()
    LaunchedEffect(Unit) { viewModel.cargarConsentimientos() }
    ListaPermisosScreen(
        permisos = estado.permisos,
        consentimientos = estado.consentimientos,
        onAbrirPermiso = { if (estado.puedeOtorgar(it)) onAbrirPermiso(it) },
        onReintentar = viewModel::cargarConsentimientos,
    )
}

/**
 * Conecta [PermisoOpenFinanceScreen] con [PrivacidadViewModel] (sin lógica propia de negocio):
 * - con un consentimiento `ACTIVO` en la lista, muestra su comprobante; si no, el texto vigente y
 *   el formulario;
 * - 409 `CONSENTIMIENTO_YA_VIGENTE` no es un error: se informa "ya está otorgada" y se muestra el
 *   comprobante de ese consentimiento;
 * - la biometría cancelada no llama al servidor (lo garantiza el caso de uso) y se informa sin modal;
 * - cualquier otro fallo abre el modal "No fue posible otorgar autorización".
 *
 * Revocar (HU-M09): tras la confirmación explícita de la pantalla, el resultado del servidor se
 * informa tal cual: `REVOCADO` → "Autorización revocada"; `VENCIDO` → "ya no estaba vigente" (no
 * es una revocación). La biometría cancelada se informa sin modal; los demás fallos abren el modal
 * "No fue posible revocar la autorización", con "Reintentar" solo si es reintentable. El
 * comprobante carga su historial.
 */
@Composable
fun PermisoOpenFinanceRoute(viewModel: PrivacidadViewModel, onVolver: () -> Unit) {
    val estado by viewModel.uiState.collectAsState()
    val idioma = idiomaTexto(LocalConfiguration.current.locales[0])
    var comprobanteId by rememberSaveable { mutableStateOf<String?>(null) }
    var aviso by rememberSaveable { mutableStateOf<AvisoPermiso?>(null) }

    LaunchedEffect(Unit) {
        val activo = (estado.consentimientos as? Carga.Lista)?.valor?.firstOrNull { it.estado == EstadoConsentimiento.ACTIVO }
        if (activo != null) {
            comprobanteId = activo.id
            viewModel.verConsentimiento(activo.id)
        } else if (comprobanteId == null) {
            viewModel.cargarTextoVigente(idioma)
        }
    }

    val otorgamiento = estado.otorgamiento
    LaunchedEffect(otorgamiento) {
        if (otorgamiento is EstadoOtorgamiento.Otorgado) {
            aviso = if (otorgamiento.repeticion) AvisoPermiso.YA_OTORGADA else AvisoPermiso.OTORGADA
            // El comprobante queda fijado aunque luego se revoque y el otorgamiento se descarte.
            comprobanteId = otorgamiento.consentimiento.id
        }
        val fallo = (otorgamiento as? EstadoOtorgamiento.Fallido)?.fallo
        if (fallo is FalloConsentimiento.YaVigente && fallo.consentimientoId != null) {
            comprobanteId = fallo.consentimientoId
            aviso = AvisoPermiso.YA_OTORGADA
            viewModel.verConsentimiento(fallo.consentimientoId)
            viewModel.descartarOtorgamiento()
        }
        if (fallo is FalloConsentimiento.BiometriaNoConfirmada && fallo.motivo == ConfirmacionBiometrica.CANCELADA) {
            aviso = AvisoPermiso.BIOMETRIA_CANCELADA
            viewModel.descartarOtorgamiento()
        }
    }

    val revocacion = estado.revocacion
    LaunchedEffect(revocacion) {
        if (revocacion is EstadoRevocacion.Resuelto) {
            comprobanteId = revocacion.consentimiento.id
            aviso = avisoRevocacion(revocacion.consentimiento)
            viewModel.descartarRevocacion()
        }
        val fallo = (revocacion as? EstadoRevocacion.Fallido)?.fallo
        if (fallo is FalloConsentimiento.BiometriaNoConfirmada && fallo.motivo == ConfirmacionBiometrica.CANCELADA) {
            aviso = AvisoPermiso.BIOMETRIA_CANCELADA_REVOCAR
            viewModel.descartarRevocacion()
        }
    }

    // El historial del comprobante que se muestra; uno de otro consentimiento aún no es el suyo.
    LaunchedEffect(comprobanteId) { comprobanteId?.let(viewModel::cargarHistorial) }
    val historial = estado.historial.takeUnless {
        it is Carga.Lista && it.valor.consentimientoId != comprobanteId
    } ?: Carga.Cargando
    val revocando = revocacion == EstadoRevocacion.EnCurso

    val vista = when {
        otorgamiento is EstadoOtorgamiento.Otorgado ->
            VistaPermiso.Comprobante(otorgamiento.consentimiento, historial, revocando)
        comprobanteId != null -> when (val detalle = estado.detalle) {
            is Carga.Lista -> VistaPermiso.Comprobante(detalle.valor, historial, revocando)
            is Carga.Error -> VistaPermiso.ErrorCarga { comprobanteId?.let(viewModel::verConsentimiento) }
            Carga.Inactiva, Carga.Cargando -> VistaPermiso.Cargando
        }
        else -> when (val texto = estado.texto) {
            is Carga.Lista -> VistaPermiso.Formulario(
                texto.valor,
                otorgamiento == EstadoOtorgamiento.EnCurso,
                anteriores = (estado.consentimientos as? Carga.Lista)?.valor
                    ?.filter { it.estado != EstadoConsentimiento.ACTIVO }
                    .orEmpty(),
            )
            is Carga.Error -> VistaPermiso.ErrorCarga { viewModel.cargarTextoVigente(idioma) }
            Carga.Inactiva, Carga.Cargando -> VistaPermiso.Cargando
        }
    }
    val falloModal = (otorgamiento as? EstadoOtorgamiento.Fallido)?.fallo?.takeUnless { it.seResuelveSinModal() }
    val falloRevocar = (revocacion as? EstadoRevocacion.Fallido)?.fallo?.takeUnless { it.seResuelveSinModal() }

    PermisoOpenFinanceScreen(
        vista = vista,
        aviso = aviso,
        falloOtorgar = falloModal,
        onVolver = {
            viewModel.descartarOtorgamiento()
            onVolver()
        },
        onOtorgar = {
            aviso = null
            viewModel.otorgar(it)
        },
        onReintentarOtorgar = {
            aviso = null
            viewModel.reintentarOtorgamiento()
        },
        onCerrarError = {
            viewModel.descartarOtorgamiento()
            // El texto cambió en el servidor: se vuelve a mostrar antes de permitir otra confirmación.
            if (falloModal == FalloConsentimiento.TextoNoVigente) viewModel.cargarTextoVigente(idioma)
        },
        falloRevocar = falloRevocar,
        onRevocar = {
            aviso = null
            viewModel.revocar(it)
        },
        onReintentarRevocar = {
            aviso = null
            viewModel.reintentarRevocacion()
        },
        onCerrarErrorRevocar = {
            viewModel.descartarRevocacion()
            // Ya no existe o no es del titular: la lista del panel se actualiza.
            if (falloRevocar == FalloConsentimiento.NoEncontrado) viewModel.cargarConsentimientos()
        },
        onReintentarHistorial = { comprobanteId?.let(viewModel::cargarHistorial) },
        onVerHistorialAnterior = { id ->
            aviso = null
            comprobanteId = id
            viewModel.verConsentimiento(id)
        },
    )
}

/** El estado que devolvió el servidor al revocar, sin reinterpretarlo. */
private fun avisoRevocacion(consentimiento: Consentimiento): AvisoPermiso = when (consentimiento.estado) {
    EstadoConsentimiento.REVOCADO -> AvisoPermiso.REVOCADA
    EstadoConsentimiento.VENCIDO -> AvisoPermiso.YA_NO_VIGENTE
    EstadoConsentimiento.ACTIVO, EstadoConsentimiento.DESCONOCIDO -> AvisoPermiso.ESTADO_ACTUALIZADO
}

/** Estos fallos se muestran como aviso o comprobante, no con el modal de error. */
private fun FalloConsentimiento.seResuelveSinModal(): Boolean =
    (this is FalloConsentimiento.YaVigente && consentimientoId != null) ||
        (this is FalloConsentimiento.BiometriaNoConfirmada && motivo == ConfirmacionBiometrica.CANCELADA)
