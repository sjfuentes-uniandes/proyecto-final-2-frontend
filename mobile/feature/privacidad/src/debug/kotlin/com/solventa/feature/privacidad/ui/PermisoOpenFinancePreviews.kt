package com.solventa.feature.privacidad.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.privacidad.dominio.FalloConsentimiento

/**
 * Previews de [PermisoOpenFinanceScreen] (mockup_1_HUM08.png): formulario, comprobante, avisos y
 * el modal "No fue posible otorgar autorización". Solo variante debug.
 */
@Preview(name = "Detalle · sin consentimiento (texto vigente, casillas y vigencia)", showBackground = true, heightDp = 1400)
@Composable
private fun DetalleFormulario() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = false), null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · otorgando", showBackground = true, heightDp = 1400)
@Composable
private fun DetalleOtorgando() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = true), null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · cargando", showBackground = true)
@Composable
private fun DetalleCargando() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Cargando, null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · error de carga", showBackground = true)
@Composable
private fun DetalleErrorCarga() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.ErrorCarga {}, null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · con consentimiento activo (comprobante)", showBackground = true, heightDp = 1000)
@Composable
private fun DetalleComprobante() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Comprobante(MuestrasPreview.activo), null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · otorgada (comprobante)", showBackground = true, heightDp = 1000)
@Composable
private fun DetalleOtorgada() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Comprobante(MuestrasPreview.activo), AvisoPermiso.OTORGADA, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · ya está otorgada", showBackground = true, heightDp = 1000)
@Composable
private fun DetalleYaOtorgada() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Comprobante(MuestrasPreview.activo), AvisoPermiso.YA_OTORGADA, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · comprobante revocado", showBackground = true, heightDp = 1000)
@Composable
private fun DetalleRevocado() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Comprobante(MuestrasPreview.revocado), null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · biometría cancelada", showBackground = true, heightDp = 1400)
@Composable
private fun DetalleBiometriaCancelada() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = false), AvisoPermiso.BIOMETRIA_CANCELADA, null, {}, {}, {}, {}) }

/** Fallo reintentable: el modal ofrece "Reintentar" (con la misma clave). */
@Preview(name = "Modal · con Reintentar", showBackground = true)
@Composable
private fun ModalConReintentar() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = false), null, FalloConsentimiento.ServicioNoDisponible, {}, {}, {}, {}) }

/** Rechazo definitivo: solo "Cerrar". */
@Preview(name = "Modal · sin Reintentar", showBackground = true)
@Composable
private fun ModalSinReintentar() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = false), null, FalloConsentimiento.VigenciaInvalida, {}, {}, {}, {}) }

@Preview(name = "Modal · solicitud incompleta (campos)", showBackground = true)
@Composable
private fun ModalSolicitudIncompleta() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = false), null, FalloConsentimiento.SolicitudInvalida(listOf("alcances", "vigenciaMeses")), {}, {}, {}, {}) }

@Preview(name = "Detalle · sin consentimiento · en-US", showBackground = true, heightDp = 1400, locale = "en-rUS")
@Composable
private fun DetalleFormularioEnUs() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEnUs, enCurso = false), null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · comprobante · en-US", showBackground = true, heightDp = 1000, locale = "en-rUS")
@Composable
private fun DetalleComprobanteEnUs() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Comprobante(MuestrasPreview.activo), null, null, {}, {}, {}, {}) }

@Preview(name = "Detalle · fuente al 200 %", showBackground = true, heightDp = 2400, fontScale = 2f)
@Composable
private fun DetalleFuente200() = SolventaTheme { PermisoOpenFinanceScreen(VistaPermiso.Formulario(MuestrasPreview.textoEsCo, enCurso = false), null, null, {}, {}, {}, {}) }
