package com.solventa.feature.onboardingidentidad.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.CampoEtiquetado
import com.solventa.core.designsystem.LogotipoSolventa
import com.solventa.core.designsystem.SolventaTema
import com.solventa.core.designsystem.TextoAdvertencia
import com.solventa.feature.onboardingidentidad.R
import com.solventa.feature.onboardingidentidad.verificacion.MotivoCapturaInvalida

/**
 * Formulario de registro del mockup de HU-M06: correo, contraseña, confirmación y el campo para
 * registrar la biometría. El ícono de galería se dibuja como en el mockup pero queda deshabilitado:
 * la selfie solo se captura en vivo, nunca se elige de la galería.
 */
@Composable
internal fun RegistroScreen(
    uiState: RegistroUiState,
    identidadVerificada: Boolean,
    motivoAdvertencia: MotivoCapturaInvalida?,
    onCorreoCambiado: (String) -> Unit,
    onContrasenaCambiada: (String) -> Unit,
    onConfirmacionCambiada: (String) -> Unit,
    onCambiarVisibilidadContrasena: () -> Unit,
    onCambiarVisibilidadConfirmacion: () -> Unit,
    onRegistrarBiometriaClick: () -> Unit,
    onRegistrarmeClick: () -> Unit,
    procesando: Boolean = false,
    mensajeCuenta: Int? = null,
) {
    val colores = SolventaTema.colores
    Surface(color = colores.fondo, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.onboarding_marca),
                    style = MaterialTheme.typography.displaySmall,
                    color = colores.textoPrimario,
                    modifier = Modifier.semantics { heading() },
                )
                LogotipoSolventa(tamano = 72.dp)
            }

            Spacer(Modifier.height(16.dp))
            Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    stringResource(R.string.onboarding_registro_titulo),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colores.textoPrimario,
                    textAlign = TextAlign.Center,
                )
                Text(
                    stringResource(R.string.onboarding_registro_subtitulo),
                    style = MaterialTheme.typography.bodyMedium,
                    color = colores.textoPrimario,
                    textAlign = TextAlign.Center,
                )
            }

            Spacer(Modifier.height(20.dp))
            Surface(shape = RoundedCornerShape(20.dp), color = colores.panel, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                    CampoEtiquetado(
                        etiqueta = stringResource(R.string.onboarding_etiqueta_correo),
                        valor = uiState.correo,
                        onValorCambiado = onCorreoCambiado,
                        placeholder = stringResource(R.string.onboarding_placeholder_correo),
                        tipoTeclado = KeyboardType.Email,
                        mensajeError = if (uiState.mostrarErrorCorreo) stringResource(R.string.onboarding_correo_invalido) else null,
                    )
                    Spacer(Modifier.height(12.dp))
                    CampoEtiquetado(
                        etiqueta = stringResource(R.string.onboarding_etiqueta_contrasena),
                        valor = uiState.contrasena,
                        onValorCambiado = onContrasenaCambiada,
                        esContrasena = true,
                        contrasenaVisible = uiState.contrasenaVisible,
                        onCambiarVisibilidad = onCambiarVisibilidadContrasena,
                        descripcionMostrar = stringResource(R.string.onboarding_mostrar_contrasena),
                        descripcionOcultar = stringResource(R.string.onboarding_ocultar_contrasena),
                        mensajeError = if (uiState.mostrarErrorContrasena) stringResource(R.string.onboarding_contrasena_politica) else null,
                    )
                    Spacer(Modifier.height(12.dp))
                    CampoEtiquetado(
                        etiqueta = stringResource(R.string.onboarding_etiqueta_confirmar_contrasena),
                        valor = uiState.confirmacion,
                        onValorCambiado = onConfirmacionCambiada,
                        esContrasena = true,
                        contrasenaVisible = uiState.confirmacionVisible,
                        onCambiarVisibilidad = onCambiarVisibilidadConfirmacion,
                        descripcionMostrar = stringResource(R.string.onboarding_mostrar_contrasena),
                        descripcionOcultar = stringResource(R.string.onboarding_ocultar_contrasena),
                        mensajeError = if (uiState.contrasenasCoinciden) null else stringResource(R.string.onboarding_contrasenas_no_coinciden),
                    )

                    Spacer(Modifier.height(12.dp))
                    Text(
                        stringResource(R.string.onboarding_etiqueta_biometria),
                        color = colores.textoPrimario,
                        style = MaterialTheme.typography.labelLarge,
                    )
                    Spacer(Modifier.height(4.dp))
                    CampoBiometria(verificada = identidadVerificada, onClick = onRegistrarBiometriaClick)

                    if (motivoAdvertencia != null) {
                        Spacer(Modifier.height(8.dp))
                        TextoAdvertencia(
                            titulo = stringResource(R.string.onboarding_advertencia_titulo),
                            subtitulo = stringResource(recursoSubtituloAdvertencia(motivoAdvertencia)),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    if (mensajeCuenta != null) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            stringResource(mensajeCuenta),
                            color = colores.advertencia,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
                        )
                    }

                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = onRegistrarmeClick,
                        enabled = uiState.puedeRegistrar(identidadVerificada) && !procesando,
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(containerColor = colores.acento),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(if (procesando) R.string.onboarding_creando_cuenta else R.string.onboarding_boton_registrarme))
                    }
                }
            }
        }
    }
}

@Composable
private fun CampoBiometria(verificada: Boolean, onClick: () -> Unit) {
    val colores = SolventaTema.colores
    Surface(
        onClick = onClick,
        enabled = !verificada,
        shape = RoundedCornerShape(12.dp),
        color = colores.campoBiometria,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.heightIn(min = 48.dp).padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(
                    if (verificada) R.string.onboarding_biometria_verificada else R.string.onboarding_boton_registrar_biometria,
                ),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (verificada) FontWeight.SemiBold else FontWeight.Normal,
                color = colores.textoPrimario,
                modifier = Modifier.weight(1f),
            )
            if (verificada) {
                Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = colores.exito, modifier = Modifier.size(24.dp))
            }
            // Deshabilitado a propósito (AC4): la selfie no puede venir de la galería. Es decorativo.
            Icon(
                Icons.Outlined.Image,
                contentDescription = null,
                tint = colores.textoPrimario.copy(alpha = 0.38f),
                modifier = Modifier.size(24.dp),
            )
            Icon(Icons.Outlined.Videocam, contentDescription = null, tint = colores.textoPrimario, modifier = Modifier.size(24.dp))
        }
    }
}
