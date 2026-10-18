package com.solventa.feature.privacidad.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.privacidad.Carga
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial

/**
 * Previews de la revocación y el historial (HU-M09, mockup_1_HUM09.png): botón rojo, confirmación,
 * resultados, modal de error e historial. Solo variante debug.
 */
@Composable
private fun Comprobante(
    consentimiento: Consentimiento,
    historial: Carga<Historial>,
    aviso: AvisoPermiso? = null,
    revocando: Boolean = false,
    falloRevocar: FalloConsentimiento? = null,
) = SolventaTheme {
    PermisoOpenFinanceScreen(
        vista = VistaPermiso.Comprobante(consentimiento, historial, revocando),
        aviso = aviso,
        falloOtorgar = null,
        onVolver = {},
        onOtorgar = {},
        onReintentarOtorgar = {},
        onCerrarError = {},
        falloRevocar = falloRevocar,
    )
}

@Preview(name = "Revocar · activo con REVOCAR AUTORIZACIÓN e historial", showBackground = true, heightDp = 1200)
@Composable
private fun RevocarActivo() = Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialActivo))

@Preview(name = "Revocar · confirmación explícita", showBackground = true)
@Composable
private fun RevocarConfirmacion() = SolventaTheme { DialogoConfirmarRevocacion(onConfirmar = {}, onCancelar = {}) }

@Preview(name = "Revocar · revocando", showBackground = true, heightDp = 1200)
@Composable
private fun RevocarEnCurso() = Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialActivo), revocando = true)

@Preview(name = "Revocar · revocada (aviso, etiqueta e historial)", showBackground = true, heightDp = 1200)
@Composable
private fun RevocarRevocada() =
    Comprobante(MuestrasPreview.revocado, Carga.Lista(MuestrasPreview.historialRevocado), AvisoPermiso.REVOCADA)

@Preview(name = "Revocar · ya no estaba vigente (VENCIDO)", showBackground = true, heightDp = 1200)
@Composable
private fun RevocarYaNoVigente() =
    Comprobante(MuestrasPreview.vencido, Carga.Lista(MuestrasPreview.historialVencido), AvisoPermiso.YA_NO_VIGENTE)

@Preview(name = "Revocar · biometría cancelada", showBackground = true, heightDp = 1200)
@Composable
private fun RevocarBiometriaCancelada() =
    Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialActivo), AvisoPermiso.BIOMETRIA_CANCELADA_REVOCAR)

/** 503: el modal ofrece "Reintentar" (revocar es idempotente). */
@Preview(name = "Revocar · modal con Reintentar (503)", showBackground = true)
@Composable
private fun RevocarModalReintentar() =
    Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialActivo), falloRevocar = FalloConsentimiento.ServicioNoDisponible)

/** 404: solo "Cerrar". */
@Preview(name = "Revocar · modal sin Reintentar (404)", showBackground = true)
@Composable
private fun RevocarModalNoEncontrada() =
    Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialActivo), falloRevocar = FalloConsentimiento.NoEncontrado)

@Preview(name = "Revocar · sin biometría configurada", showBackground = true)
@Composable
private fun RevocarSinBiometria() = Comprobante(
    MuestrasPreview.activo,
    Carga.Lista(MuestrasPreview.historialActivo),
    falloRevocar = FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.NO_DISPONIBLE),
)

@Preview(name = "Historial · cargando", showBackground = true, heightDp = 1200)
@Composable
private fun HistorialCargando() = Comprobante(MuestrasPreview.activo, Carga.Cargando)

@Preview(name = "Historial · error", showBackground = true, heightDp = 1200)
@Composable
private fun HistorialError() = Comprobante(MuestrasPreview.activo, Carga.Error(FalloConsentimiento.SinConexion))

@Preview(name = "Historial · vacío", showBackground = true, heightDp = 1200)
@Composable
private fun HistorialVacio() = Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialActivo.copy(hitos = emptyList())))

@Preview(name = "Historial · hito desconocido (N-1)", showBackground = true, heightDp = 1200)
@Composable
private fun HistorialDesconocido() = Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialConDesconocido))

@Preview(name = "Detalle · sin vigente, con autorizaciones anteriores", showBackground = true, heightDp = 1800)
@Composable
private fun DetalleConAnteriores() = SolventaTheme {
    PermisoOpenFinanceScreen(
        VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = false, anteriores = listOf(MuestrasPreview.revocado, MuestrasPreview.vencido)),
        null,
        null,
        {},
        {},
        {},
        {},
    )
}

@Preview(name = "Revocar · revocada · en-US", showBackground = true, heightDp = 1200, locale = "en-rUS")
@Composable
private fun RevocarRevocadaEnUs() =
    Comprobante(MuestrasPreview.revocado, Carga.Lista(MuestrasPreview.historialRevocado), AvisoPermiso.REVOCADA)

@Preview(name = "Revocar · fuente al 200 %", showBackground = true, heightDp = 2400, fontScale = 2f)
@Composable
private fun RevocarFuente200() = Comprobante(MuestrasPreview.activo, Carga.Lista(MuestrasPreview.historialActivo))
