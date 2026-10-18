package com.solventa.feature.onboardingidentidad.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.onboardingidentidad.R
import com.solventa.feature.onboardingidentidad.captura.PasoCaptura
import com.solventa.feature.onboardingidentidad.verificacion.EtapaVerificacion

internal class AccionesVerificacion(
    val onPermitir: () -> Unit,
    val onAbrirAjustes: () -> Unit,
    val onCancelar: () -> Unit,
    val onContinuar: () -> Unit,
    val onReintentar: () -> Unit,
    val onIntentarDeNuevo: () -> Unit,
    val onIrAIngreso: () -> Unit,
)

/**
 * Pantalla completa de la verificación: captura con guía en vivo, permiso de cámara o resultado,
 * según la [etapa]. La cámara se recibe como ranura para poder dibujarla sin una cámara real.
 */
@Composable
internal fun PantallaVerificacion(
    etapa: EtapaVerificacion,
    camara: @Composable (Modifier) -> Unit,
    acciones: AccionesVerificacion,
) {
    val resultado = contenidoResultado(etapa)
    when {
        resultado != null -> PantallaResultado(resultado, acciones)
        etapa == EtapaVerificacion.PermisoDenegado -> PantallaPermiso(acciones)
        else -> PantallaCaptura(etapa, camara, acciones.onCancelar)
    }
}

@Composable
private fun PantallaCaptura(
    etapa: EtapaVerificacion,
    camara: @Composable (Modifier) -> Unit,
    onCancelar: () -> Unit,
) {
    val colores = SolventaTema.colores
    val descripcionCamara = stringResource(R.string.onboarding_camara_descripcion)
    val paso = (etapa as? EtapaVerificacion.Capturando)?.paso
    val textoEstado = when (etapa) {
        is EtapaVerificacion.Capturando -> stringResource(recursoGuia(paso))
        EtapaVerificacion.Enviando -> stringResource(R.string.onboarding_enviando)
        else -> ""
    }

    Surface(color = colores.fondo, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.onboarding_captura_titulo),
                style = MaterialTheme.typography.headlineSmall,
                color = colores.textoPrimario,
                textAlign = TextAlign.Center,
                modifier = Modifier.semantics { heading() },
            )
            Spacer(Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(3f / 4f)
                    .clip(RoundedCornerShape(24.dp))
                    .background(colores.panel),
                contentAlignment = Alignment.Center,
            ) {
                when (etapa) {
                    is EtapaVerificacion.Capturando ->
                        camara(Modifier.fillMaxSize().semantics { contentDescription = descripcionCamara })
                    EtapaVerificacion.Enviando -> CircularProgressIndicator(color = colores.acento)
                    else -> Unit
                }
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = textoEstado,
                style = MaterialTheme.typography.titleMedium,
                color = if (paso is PasoCaptura.Completado) colores.exito else colores.textoPrimario,
                textAlign = TextAlign.Center,
                // Los cambios de guía se anuncian solos a los lectores de pantalla.
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
            Spacer(Modifier.height(16.dp))
            TextButton(onClick = onCancelar) {
                Text(stringResource(R.string.onboarding_boton_cancelar), color = colores.acento)
            }
        }
    }
}

@Composable
private fun PantallaPermiso(acciones: AccionesVerificacion) {
    PantallaMensaje(
        icono = Icons.Filled.PhotoCamera,
        colorIcono = SolventaTema.colores.acento,
        titulo = stringResource(R.string.onboarding_permiso_titulo),
        mensaje = stringResource(R.string.onboarding_permiso_mensaje),
        codigoSoporte = null,
        acciones = listOf(
            stringResource(R.string.onboarding_permiso_boton_permitir) to acciones.onPermitir,
            stringResource(R.string.onboarding_permiso_boton_ajustes) to acciones.onAbrirAjustes,
            stringResource(R.string.onboarding_boton_cancelar) to acciones.onCancelar,
        ),
    )
}

@Composable
private fun PantallaResultado(contenido: ContenidoResultado, acciones: AccionesVerificacion) {
    val colores = SolventaTema.colores
    val (icono, color) = when (contenido.tipo) {
        TipoResultado.EXITO -> Icons.Filled.CheckCircle to colores.exito
        TipoResultado.INTERRUPCION -> Icons.Filled.CloudOff to colores.acento
        TipoResultado.ADVERTENCIA -> Icons.Filled.Warning to colores.advertencia
    }
    val botones = listOfNotNull(contenido.principal, contenido.secundaria).map { accion ->
        stringResource(accion.texto) to when (accion) {
            AccionResultado.CONTINUAR -> acciones.onContinuar
            AccionResultado.REINTENTAR -> acciones.onReintentar
            AccionResultado.INTENTAR_DE_NUEVO -> acciones.onIntentarDeNuevo
            AccionResultado.IR_A_INGRESO -> acciones.onIrAIngreso
            AccionResultado.CANCELAR -> acciones.onCancelar
        }
    }
    PantallaMensaje(
        icono = icono,
        colorIcono = color,
        titulo = stringResource(contenido.titulo),
        mensaje = stringResource(contenido.mensaje),
        codigoSoporte = contenido.correlationId?.let { stringResource(R.string.onboarding_codigo_soporte, it) },
        acciones = botones,
    )
}

/** Mensaje centrado con ícono. La primera acción es el botón principal; el resto, botones de texto. */
@Composable
private fun PantallaMensaje(
    icono: ImageVector,
    colorIcono: Color,
    titulo: String,
    mensaje: String,
    codigoSoporte: String?,
    acciones: List<Pair<String, () -> Unit>>,
) {
    val colores = SolventaTema.colores
    Surface(color = colores.fondo, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(icono, contentDescription = null, tint = colorIcono, modifier = Modifier.size(64.dp))
            Spacer(Modifier.height(16.dp))
            Text(
                text = titulo,
                style = MaterialTheme.typography.headlineSmall,
                color = colores.textoPrimario,
                textAlign = TextAlign.Center,
                modifier = Modifier.semantics {
                    heading()
                    liveRegion = LiveRegionMode.Polite
                },
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = mensaje,
                style = MaterialTheme.typography.bodyLarge,
                color = colores.textoSecundario,
                textAlign = TextAlign.Center,
            )
            if (codigoSoporte != null) {
                Spacer(Modifier.height(8.dp))
                Text(codigoSoporte, style = MaterialTheme.typography.bodySmall, color = colores.textoSecundario)
            }
            Spacer(Modifier.height(24.dp))
            acciones.forEachIndexed { indice, (texto, accion) ->
                if (indice == 0) {
                    Button(
                        onClick = accion,
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(containerColor = colores.acento),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(texto) }
                } else {
                    TextButton(onClick = accion) { Text(texto, color = colores.acento) }
                }
            }
        }
    }
}
