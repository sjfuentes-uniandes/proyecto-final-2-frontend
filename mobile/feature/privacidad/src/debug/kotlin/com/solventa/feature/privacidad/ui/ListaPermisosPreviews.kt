package com.solventa.feature.privacidad.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.solventa.core.designsystem.SolventaTheme
import com.solventa.feature.privacidad.Carga
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Permiso

/** Previews de [ListaPermisosScreen] (mockup_pantalla_movil_permisos.png). Solo variante debug. */
@Preview(name = "Lista · con datos", showBackground = true)
@Composable
private fun ListaConDatos() = SolventaTheme { ListaPermisosScreen(Permiso.entries, Carga.Lista(listOf(MuestrasPreview.activo, MuestrasPreview.revocado)), {}, {}) }

@Preview(name = "Lista · revocada", showBackground = true)
@Composable
private fun ListaRevocada() = SolventaTheme { ListaPermisosScreen(Permiso.entries, Carga.Lista(listOf(MuestrasPreview.revocado)), {}, {}) }

@Preview(name = "Lista · vacía", showBackground = true)
@Composable
private fun ListaVacia() = SolventaTheme { ListaPermisosScreen(Permiso.entries, Carga.Lista(emptyList()), {}, {}) }

@Preview(name = "Lista · cargando", showBackground = true)
@Composable
private fun ListaCargando() = SolventaTheme { ListaPermisosScreen(Permiso.entries, Carga.Cargando, {}, {}) }

@Preview(name = "Lista · error", showBackground = true)
@Composable
private fun ListaError() = SolventaTheme { ListaPermisosScreen(Permiso.entries, Carga.Error(FalloConsentimiento.SinConexion), {}, {}) }

/** ADR 0001: solo los dos permisos que esta versión no puede otorgar, deshabilitados. */
@Preview(name = "Lista · permiso no soportado", showBackground = true)
@Composable
private fun ListaPermisoNoSoportado() = SolventaTheme { ListaPermisosScreen(listOf(Permiso.DATOS_PERSONALES_FINANCIEROS, Permiso.BIOMETRICOS_IDENTIDAD), Carga.Lista(emptyList()), {}, {}) }

@Preview(name = "Lista · con datos · en-US", showBackground = true, locale = "en-rUS")
@Composable
private fun ListaConDatosEnUs() = SolventaTheme { ListaPermisosScreen(Permiso.entries, Carga.Lista(listOf(MuestrasPreview.activo)), {}, {}) }
