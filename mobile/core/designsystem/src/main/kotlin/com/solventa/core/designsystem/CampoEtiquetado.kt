package com.solventa.core.designsystem

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp

/**
 * Campo de texto con la etiqueta en negrita encima, como en los mockups de ingreso y registro. Si
 * [esContrasena] y se da [onCambiarVisibilidad], muestra el ojo para ver u ocultar el texto.
 * La etiqueta también se expone como nombre del campo para los lectores de pantalla.
 */
@Composable
fun CampoEtiquetado(
    etiqueta: String,
    valor: String,
    onValorCambiado: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    tipoTeclado: KeyboardType = KeyboardType.Text,
    esContrasena: Boolean = false,
    contrasenaVisible: Boolean = false,
    onCambiarVisibilidad: (() -> Unit)? = null,
    descripcionMostrar: String = "",
    descripcionOcultar: String = "",
    mensajeError: String? = null,
) {
    val colores = SolventaTema.colores
    Text(etiqueta, color = colores.textoPrimario, style = MaterialTheme.typography.labelLarge)
    Spacer(Modifier.height(4.dp))
    OutlinedTextField(
        value = valor,
        onValueChange = onValorCambiado,
        placeholder = placeholder?.let { texto -> { Text(texto, color = colores.textoSecundario) } },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        isError = mensajeError != null,
        supportingText = mensajeError?.let { texto -> { Text(texto) } },
        keyboardOptions = KeyboardOptions(keyboardType = if (esContrasena) KeyboardType.Password else tipoTeclado),
        visualTransformation = if (esContrasena && !contrasenaVisible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (esContrasena && onCambiarVisibilidad != null) {
            {
                IconButton(onClick = onCambiarVisibilidad) {
                    Icon(
                        imageVector = if (contrasenaVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = if (contrasenaVisible) descripcionOcultar else descripcionMostrar,
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
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = etiqueta },
    )
}
