package com.solventa.feature.notificaciones.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.core.content.ContextCompat
import com.solventa.feature.notificaciones.R

/**
 * Explica y pide `POST_NOTIFICATIONS` (solo API ≥ 33) una vez, tras el primer ingreso. Que se
 * niegue no impide el registro del dispositivo: el token se registra igual.
 */
@Composable
fun PermisoNotificacionesRoute(
    registro: RegistroExplicacionPermiso,
    sdk: Int = Build.VERSION.SDK_INT,
) {
    val contexto = LocalContext.current
    var visible by remember {
        mutableStateOf(sdk >= Build.VERSION_CODES.TIRAMISU && !permisoConcedido(contexto) && !registro.yaMostrada())
    }
    val lanzador = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    if (!visible) return

    PermisoNotificacionesDialogo(
        onActivar = {
            registro.marcarMostrada()
            visible = false
            lanzador.launch(Manifest.permission.POST_NOTIFICATIONS)
        },
        onAhoraNo = {
            registro.marcarMostrada()
            visible = false
        },
    )
}

@Composable
fun PermisoNotificacionesDialogo(onActivar: () -> Unit, onAhoraNo: () -> Unit) {
    AlertDialog(
        modifier = Modifier.testTag(EtiquetasPermisoNotificaciones.DIALOGO),
        onDismissRequest = onAhoraNo,
        title = {
            Text(
                text = stringResource(R.string.notificaciones_permiso_titulo),
                modifier = Modifier.semantics { heading() },
            )
        },
        text = { Text(stringResource(R.string.notificaciones_permiso_mensaje)) },
        confirmButton = {
            TextButton(onClick = onActivar, modifier = Modifier.testTag(EtiquetasPermisoNotificaciones.ACTIVAR)) {
                Text(stringResource(R.string.notificaciones_permiso_activar))
            }
        },
        dismissButton = {
            TextButton(onClick = onAhoraNo, modifier = Modifier.testTag(EtiquetasPermisoNotificaciones.AHORA_NO)) {
                Text(stringResource(R.string.notificaciones_permiso_ahora_no))
            }
        },
    )
}

private fun permisoConcedido(contexto: Context): Boolean =
    ContextCompat.checkSelfPermission(contexto, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
