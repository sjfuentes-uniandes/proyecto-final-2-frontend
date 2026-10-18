package com.solventa.feature.onboardingidentidad.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.CampoEtiquetado
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.onboardingidentidad.R
import com.solventa.feature.onboardingidentidad.verificacion.ResultadoCuenta

/** Texto para un resultado de la creación de la cuenta; null si no lo requiere. */
@StringRes
internal fun recursoMensajeCuenta(resultado: ResultadoCuenta): Int? = when (resultado) {
    ResultadoCuenta.CodigoReenviado -> R.string.onboarding_codigo_reenviado
    ResultadoCuenta.CodigoIncorrecto -> R.string.onboarding_codigo_incorrecto
    ResultadoCuenta.CodigoVencido -> R.string.onboarding_codigo_vencido
    ResultadoCuenta.RequiereVerificar -> R.string.onboarding_cuenta_requiere_verificar
    ResultadoCuenta.ContrasenaInvalida -> R.string.onboarding_cuenta_contrasena_invalida
    ResultadoCuenta.IntentosExcedidos -> R.string.onboarding_cuenta_intentos
    ResultadoCuenta.SinConexion -> R.string.onboarding_cuenta_sin_conexion
    ResultadoCuenta.VinculacionPendiente -> R.string.onboarding_cuenta_vinculacion_pendiente
    ResultadoCuenta.IngresoPendiente -> R.string.onboarding_cuenta_ingreso_pendiente
    is ResultadoCuenta.Error -> R.string.onboarding_cuenta_error
    else -> null
}

/** Pide el código que Cognito envió al correo. El código vive solo en el estado local de la pantalla. */
@Composable
internal fun PantallaCodigo(
    correo: String,
    aviso: ResultadoCuenta?,
    procesando: Boolean,
    onConfirmar: (String) -> Unit,
    onReenviar: () -> Unit,
) {
    val colores = SolventaTema.colores
    var codigo by remember { mutableStateOf("") }
    val mensaje = aviso?.let(::recursoMensajeCuenta)
    val esError = aviso != null && aviso != ResultadoCuenta.CodigoReenviado

    Surface(color = colores.fondo, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
        ) {
            Text(
                stringResource(R.string.onboarding_codigo_titulo),
                style = MaterialTheme.typography.headlineSmall,
                color = colores.textoPrimario,
                modifier = Modifier.semantics { heading() },
            )
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(R.string.onboarding_codigo_mensaje, correo),
                style = MaterialTheme.typography.bodyMedium,
                color = colores.textoPrimario,
            )
            Spacer(Modifier.height(20.dp))
            CampoEtiquetado(
                etiqueta = stringResource(R.string.onboarding_codigo_etiqueta),
                valor = codigo,
                onValorCambiado = { codigo = it.filter(Char::isDigit).take(8) },
                tipoTeclado = KeyboardType.NumberPassword,
                mensajeError = if (esError && mensaje != null) stringResource(mensaje) else null,
            )
            if (!esError && mensaje != null) {
                Spacer(Modifier.height(8.dp))
                Text(stringResource(mensaje), style = MaterialTheme.typography.bodySmall, color = colores.textoPrimario)
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { onConfirmar(codigo) },
                enabled = codigo.length >= 6 && !procesando,
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = colores.acento),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(if (procesando) R.string.onboarding_creando_cuenta else R.string.onboarding_codigo_confirmar))
            }
            TextButton(onClick = onReenviar, enabled = !procesando, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.onboarding_codigo_reenviar), color = colores.textoPrimario)
            }
        }
    }
}
