package com.solventa.feature.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaColores
import com.solventa.core.designsystem.SolventaTema

/**
 * Pantalla de ingreso: credenciales + (si el dispositivo lo permite) ingreso biométrico. Replica
 * los 3 estados de los mockups: inicial, reintento biométrico y límite de intentos superado (AC5).
 */
@Composable
fun LoginScreen(
    uiState: LoginUiState,
    onCorreoCambiado: (String) -> Unit,
    onContrasenaCambiada: (String) -> Unit,
    onCambiarVisibilidadContrasena: () -> Unit,
    onIngresarClick: () -> Unit,
    onOlvideClaveClick: () -> Unit,
    onRegistrarmeClick: () -> Unit,
    onIngresoBiometricoClick: () -> Unit,
) {
    val colores = SolventaTema.colores
    val mensajeSuperior = uiState.mensaje?.takeIf { it != MensajeLogin.ReintentarBiometria }
    val mensajeBiometrico = uiState.mensaje?.takeIf { it == MensajeLogin.ReintentarBiometria }

    Surface(color = colores.fondo, modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            EncabezadoSolventa()

            mensajeSuperior?.let { mensaje ->
                Spacer(Modifier.height(16.dp))
                MensajeAdvertencia(mensaje, modifier = Modifier.fillMaxWidth())
            }

            Spacer(Modifier.height(24.dp))
            PanelCredenciales(
                uiState = uiState,
                colores = colores,
                onCorreoCambiado = onCorreoCambiado,
                onContrasenaCambiada = onContrasenaCambiada,
                onCambiarVisibilidadContrasena = onCambiarVisibilidadContrasena,
                onIngresarClick = onIngresarClick,
                onOlvideClaveClick = onOlvideClaveClick,
                onRegistrarmeClick = onRegistrarmeClick,
            )

            if (uiState.mostrarBiometria) {
                Spacer(Modifier.height(16.dp))
                PanelBiometrico(
                    colores = colores,
                    mensaje = mensajeBiometrico,
                    onIngresoBiometricoClick = onIngresoBiometricoClick,
                )
            }
        }
    }
}

@Composable
private fun EncabezadoSolventa() {
    val colores = SolventaTema.colores
    Surface(
        shape = RoundedCornerShape(24.dp),
        shadowElevation = 4.dp,
        color = colores.campoFondo,
        modifier = Modifier.size(96.dp),
    ) {
        LogotipoAbstracto()
    }
    Spacer(Modifier.height(16.dp))
    Text(
        stringResource(R.string.login_marca),
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold,
        color = colores.textoPrimario,
    )
    Spacer(Modifier.height(4.dp))
    Text(stringResource(R.string.login_bienvenido), style = MaterialTheme.typography.bodyLarge, color = colores.textoPrimario)
    Text(
        stringResource(R.string.login_subtitulo),
        style = MaterialTheme.typography.bodyMedium,
        color = colores.textoSecundario,
        textAlign = TextAlign.Center,
    )
}

/** Aproximación del isotipo (triángulo, engranaje, cuadrado) del mockup; no hay asset vectorial. */
@Composable
private fun LogotipoAbstracto() {
    val colores = SolventaTema.colores
    Box(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
        Surface(shape = RoundedCornerShape(50), color = colores.panel, modifier = Modifier.size(28.dp)) {}
        Surface(
            shape = CircleShape,
            color = colores.textoSecundario.copy(alpha = 0.35f),
            modifier = Modifier.size(24.dp).padding(start = 24.dp),
        ) {}
    }
}

@Composable
private fun MensajeAdvertencia(mensaje: MensajeLogin, modifier: Modifier = Modifier) {
    val colores = SolventaTema.colores
    Column(modifier = modifier) {
        Text(
            stringResource(mensaje.tituloRes),
            color = colores.advertencia,
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(
            stringResource(mensaje.subtituloRes),
            color = colores.advertencia,
            style = MaterialTheme.typography.bodySmall,
            textDecoration = TextDecoration.Underline,
        )
    }
}

@Composable
private fun PanelCredenciales(
    uiState: LoginUiState,
    colores: SolventaColores,
    onCorreoCambiado: (String) -> Unit,
    onContrasenaCambiada: (String) -> Unit,
    onCambiarVisibilidadContrasena: () -> Unit,
    onIngresarClick: () -> Unit,
    onOlvideClaveClick: () -> Unit,
    onRegistrarmeClick: () -> Unit,
) {
    Surface(shape = RoundedCornerShape(20.dp), color = colores.panel, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
            CampoEtiquetado(
                etiqueta = stringResource(R.string.login_etiqueta_correo),
                valor = uiState.correo,
                onValorCambiado = onCorreoCambiado,
                colores = colores,
                placeholder = stringResource(R.string.login_placeholder_correo),
            )
            Spacer(Modifier.height(12.dp))
            CampoEtiquetado(
                etiqueta = stringResource(R.string.login_etiqueta_contrasena),
                valor = uiState.contrasena,
                onValorCambiado = onContrasenaCambiada,
                colores = colores,
                esContrasena = true,
                contrasenaVisible = uiState.contrasenaVisible,
                onCambiarVisibilidad = onCambiarVisibilidadContrasena,
            )

            uiState.errorCredenciales?.let { error ->
                Spacer(Modifier.height(8.dp))
                Text(error.textoResuelto(), color = colores.advertencia, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(Modifier.height(4.dp))
            TextButton(onClick = onOlvideClaveClick, modifier = Modifier.align(Alignment.End)) {
                Text(stringResource(R.string.login_olvide_clave), color = colores.acento)
            }

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = onIngresarClick,
                enabled = uiState.puedeIngresar,
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = colores.acento),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(if (uiState.cargando) R.string.login_boton_ingresando else R.string.login_boton_ingresar))
            }

            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                Text(
                    "${stringResource(R.string.login_sin_cuenta)} ",
                    color = colores.textoSecundario,
                    style = MaterialTheme.typography.bodyMedium,
                )
                TextButton(onClick = onRegistrarmeClick) {
                    Text(stringResource(R.string.login_registrarme), color = colores.acento)
                }
            }
        }
    }
}

@Composable
private fun PanelBiometrico(
    colores: SolventaColores,
    mensaje: MensajeLogin?,
    onIngresoBiometricoClick: () -> Unit,
) {
    Surface(shape = RoundedCornerShape(20.dp), color = colores.panel, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                stringResource(R.string.login_titulo_biometrico),
                fontWeight = FontWeight.Bold,
                color = colores.textoPrimario,
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onIngresoBiometricoClick,
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = colores.acento),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.login_boton_biometria))
            }
            mensaje?.let {
                Spacer(Modifier.height(12.dp))
                MensajeAdvertencia(it, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun CampoEtiquetado(
    etiqueta: String,
    valor: String,
    onValorCambiado: (String) -> Unit,
    colores: SolventaColores,
    placeholder: String? = null,
    esContrasena: Boolean = false,
    contrasenaVisible: Boolean = false,
    onCambiarVisibilidad: (() -> Unit)? = null,
) {
    Text(etiqueta, color = colores.textoPrimario, style = MaterialTheme.typography.labelLarge)
    Spacer(Modifier.height(4.dp))
    OutlinedTextField(
        value = valor,
        onValueChange = onValorCambiado,
        placeholder = placeholder?.let { texto -> { Text(texto, color = colores.textoSecundario) } },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        visualTransformation = if (esContrasena && !contrasenaVisible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (esContrasena && onCambiarVisibilidad != null) {
            {
                IconButton(onClick = onCambiarVisibilidad) {
                    Icon(
                        imageVector = iconoVisibilidad(contrasenaVisible),
                        contentDescription = stringResource(
                            if (contrasenaVisible) R.string.login_ocultar_contrasena else R.string.login_mostrar_contrasena,
                        ),
                    )
                }
            }
        } else {
            null
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = colores.campoFondo,
            unfocusedContainerColor = colores.campoFondo,
            focusedBorderColor = colores.acento,
            unfocusedBorderColor = colores.campoBorde,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

private fun iconoVisibilidad(visible: Boolean): ImageVector = if (visible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility
