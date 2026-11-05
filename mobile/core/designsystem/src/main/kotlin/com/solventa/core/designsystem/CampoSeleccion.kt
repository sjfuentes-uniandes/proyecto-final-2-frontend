package com.solventa.core.designsystem

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

/** Opción de un [CampoSeleccion]: [valor] es lo que se guarda y [texto] lo que ve la persona. */
data class OpcionSeleccion(val valor: String, val texto: String)

/**
 * Lista desplegable de solo lectura con la etiqueta en negrita encima, con el mismo aspecto que
 * [CampoEtiquetado]. La persona elige una de las [opciones]; no puede escribir.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CampoSeleccion(
    etiqueta: String,
    valorSeleccionado: String,
    opciones: List<OpcionSeleccion>,
    onSeleccionado: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colores = SolventaTema.colores
    var expandido by remember { mutableStateOf(false) }
    Text(etiqueta, color = colores.textoPrimario, style = MaterialTheme.typography.labelLarge)
    Spacer(Modifier.height(4.dp))
    ExposedDropdownMenuBox(expanded = expandido, onExpandedChange = { expandido = it }, modifier = modifier) {
        OutlinedTextField(
            value = opciones.firstOrNull { it.valor == valorSeleccionado }?.texto ?: valorSeleccionado,
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandido) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = colores.campoFondo,
                unfocusedContainerColor = colores.campoFondo,
                focusedBorderColor = colores.acento,
                unfocusedBorderColor = colores.campoBorde,
            ),
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth()
                .semantics { contentDescription = etiqueta },
        )
        ExposedDropdownMenu(expanded = expandido, onDismissRequest = { expandido = false }) {
            opciones.forEach { opcion ->
                DropdownMenuItem(
                    text = { Text(opcion.texto) },
                    onClick = {
                        onSeleccionado(opcion.valor)
                        expandido = false
                    },
                )
            }
        }
    }
}
