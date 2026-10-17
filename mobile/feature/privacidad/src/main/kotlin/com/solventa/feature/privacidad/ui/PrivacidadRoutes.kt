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
import com.solventa.feature.privacidad.PrivacidadViewModel
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
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

    val vista = when {
        otorgamiento is EstadoOtorgamiento.Otorgado -> VistaPermiso.Comprobante(otorgamiento.consentimiento)
        comprobanteId != null -> when (val detalle = estado.detalle) {
            is Carga.Lista -> VistaPermiso.Comprobante(detalle.valor)
            is Carga.Error -> VistaPermiso.ErrorCarga { comprobanteId?.let(viewModel::verConsentimiento) }
            Carga.Inactiva, Carga.Cargando -> VistaPermiso.Cargando
        }
        else -> when (val texto = estado.texto) {
            is Carga.Lista -> VistaPermiso.Formulario(texto.valor, otorgamiento == EstadoOtorgamiento.EnCurso)
            is Carga.Error -> VistaPermiso.ErrorCarga { viewModel.cargarTextoVigente(idioma) }
            Carga.Inactiva, Carga.Cargando -> VistaPermiso.Cargando
        }
    }
    val falloModal = (otorgamiento as? EstadoOtorgamiento.Fallido)?.fallo?.takeUnless { it.seResuelveSinModal() }

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
    )
}

/** Estos fallos se muestran como aviso o comprobante, no con el modal de error. */
private fun FalloConsentimiento.seResuelveSinModal(): Boolean =
    (this is FalloConsentimiento.YaVigente && consentimientoId != null) ||
        (this is FalloConsentimiento.BiometriaNoConfirmada && motivo == ConfirmacionBiometrica.CANCELADA)
