package com.solventa.feature.onboardingidentidad.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solventa.feature.onboardingidentidad.captura.CamaraSelfie
import com.solventa.feature.onboardingidentidad.captura.CodificadorSelfie
import com.solventa.feature.onboardingidentidad.verificacion.CuentaViewModel
import com.solventa.feature.onboardingidentidad.verificacion.EtapaCuenta
import com.solventa.feature.onboardingidentidad.verificacion.EtapaVerificacion
import com.solventa.feature.onboardingidentidad.verificacion.FinRegistro
import com.solventa.feature.onboardingidentidad.verificacion.MotivoCapturaInvalida
import com.solventa.feature.onboardingidentidad.verificacion.ResultadoCuenta
import com.solventa.feature.onboardingidentidad.verificacion.SesionRegistro
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Conecta el formulario de registro con la verificación de identidad. Muestra el formulario y, al
 * tocar "Registrar mi biometría", la pantalla de verificación (permiso, captura y resultado).
 * [onRegistroTerminado] se llama cuando la cuenta quedó creada, ya existía o falta ingresar a mano.
 */
@Composable
fun OnboardingIdentidadRoute(
    verificacionViewModel: VerificacionIdentidadViewModel,
    cuentaViewModel: CuentaViewModel,
    sesionRegistro: SesionRegistro,
    onRegistroTerminado: (FinRegistro) -> Unit,
    onIrAIngreso: () -> Unit,
    registroViewModel: RegistroViewModel = viewModel(),
) {
    val contexto = LocalContext.current
    val alcance = rememberCoroutineScope()
    val registro by registroViewModel.uiState.collectAsStateWithLifecycle()
    val etapa by verificacionViewModel.etapa.collectAsStateWithLifecycle()
    val cuenta by cuentaViewModel.etapa.collectAsStateWithLifecycle()
    var espera by remember { mutableStateOf<EtapaCuenta.EsperandoCodigo?>(null) }

    var enCaptura by rememberSaveable { mutableStateOf(false) }
    var identidadVerificada by rememberSaveable { mutableStateOf(false) }
    var motivoAdvertencia by rememberSaveable { mutableStateOf<MotivoCapturaInvalida?>(null) }

    val lanzadorPermiso = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { concedido ->
        verificacionViewModel.onPermisoCamara(concedido)
    }
    val camaraConcedida = remember(contexto) {
        { ContextCompat.checkSelfPermission(contexto, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED }
    }

    LaunchedEffect(etapa) {
        when (val actual = etapa) {
            // AC2: se vuelve al formulario con la advertencia para repetir la captura.
            is EtapaVerificacion.CapturaInvalida -> {
                motivoAdvertencia = actual.motivo
                enCaptura = false
            }
            EtapaVerificacion.Cancelada -> enCaptura = false
            else -> Unit
        }
    }

    // La cámara se pide al abrir la captura, no antes de que la persona lo decida.
    LaunchedEffect(enCaptura, etapa) {
        if (enCaptura && etapa == EtapaVerificacion.PermisoPendiente) {
            if (camaraConcedida()) verificacionViewModel.onPermisoCamara(true) else lanzadorPermiso.launch(Manifest.permission.CAMERA)
        }
    }

    // Si la persona concedió el permiso desde la configuración del sistema, se retoma al volver.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        if (enCaptura && etapa == EtapaVerificacion.PermisoDenegado && camaraConcedida()) {
            verificacionViewModel.onPermisoCamara(true)
        }
    }

    val continuar = {
        identidadVerificada = true
        motivoAdvertencia = null
        enCaptura = false
    }

    LaunchedEffect(cuenta) {
        when (val actual = cuenta) {
            is EtapaCuenta.EsperandoCodigo -> espera = actual
            EtapaCuenta.Procesando -> Unit
            EtapaCuenta.Completada -> {
                espera = null
                onRegistroTerminado(FinRegistro.CUENTA_CREADA)
            }
            is EtapaCuenta.Fallida -> {
                espera = null
                when (actual.motivo) {
                    ResultadoCuenta.CuentaExistente -> onRegistroTerminado(FinRegistro.CUENTA_EXISTENTE)
                    ResultadoCuenta.IngresoPendiente -> onRegistroTerminado(FinRegistro.INGRESO_PENDIENTE)
                    // El token no sirve: hay que capturar de nuevo con un registroId nuevo.
                    ResultadoCuenta.RequiereVerificar -> {
                        identidadVerificada = false
                        sesionRegistro.reiniciar()
                    }
                    else -> Unit
                }
            }
            EtapaCuenta.Inactiva -> espera = null
        }
    }

    // Toda la verificación (permiso, captura y resultado) queda protegida contra capturas de pantalla.
    PantallaSegura(activa = enCaptura)

    // Al salir del registro se borran las contraseñas y cualquier selfie pendiente. Al rotar el
    // teléfono la composición también se destruye, pero entonces no se debe perder nada.
    DisposableEffect(Unit) {
        onDispose {
            if ((contexto.buscarActividad())?.isChangingConfigurations != true) {
                registroViewModel.limpiar()
                verificacionViewModel.cancelar()
                cuentaViewModel.reiniciar()
            }
        }
    }

    BackHandler(enabled = espera != null) { cuentaViewModel.reiniciar() }

    BackHandler(enabled = enCaptura) {
        // Atrás sobre un resultado aprobado no deshace la verificación: equivale a continuar.
        if (etapa is EtapaVerificacion.Aprobada) continuar() else verificacionViewModel.cancelar()
    }

    val pantallaCodigo = espera
    if (pantallaCodigo != null && !enCaptura) {
        PantallaCodigo(
            correo = pantallaCodigo.correo,
            aviso = pantallaCodigo.aviso,
            procesando = cuenta == EtapaCuenta.Procesando,
            onConfirmar = cuentaViewModel::confirmar,
            onReenviar = cuentaViewModel::reenviarCodigo,
        )
    } else if (enCaptura) {
        PantallaVerificacion(
            etapa = etapa,
            camara = { modificador ->
                CamaraSelfie(
                    alObservar = verificacionViewModel::onFrame,
                    alCapturar = { bitmap ->
                        alcance.launch {
                            // Codificar y comprimir es costoso: se hace fuera del hilo principal. Siempre
                            // termina (NonCancellable) para poder borrar la selfie si ya nadie la espera.
                            val selfie = withContext(NonCancellable + Dispatchers.Default) {
                                CodificadorSelfie.codificar(bitmap).also { bitmap.recycle() }
                            }
                            if (isActive) verificacionViewModel.onSelfieCapturada(selfie) else selfie?.limpiar()
                        }
                    },
                    alFallar = { verificacionViewModel.onCamaraNoDisponible() },
                    modifier = modificador,
                )
            },
            acciones = AccionesVerificacion(
                onPermitir = { lanzadorPermiso.launch(Manifest.permission.CAMERA) },
                onAbrirAjustes = {
                    contexto.startActivity(
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", contexto.packageName, null)),
                    )
                },
                onCancelar = verificacionViewModel::cancelar,
                onContinuar = continuar,
                onReintentar = verificacionViewModel::reintentar,
                onIntentarDeNuevo = verificacionViewModel::repetirCaptura,
                onIrAIngreso = {
                    verificacionViewModel.cancelar()
                    onIrAIngreso()
                },
            ),
        )
    } else {
        RegistroScreen(
            uiState = registro,
            identidadVerificada = identidadVerificada,
            motivoAdvertencia = motivoAdvertencia,
            onCorreoCambiado = { nuevo ->
                // La verificación va ligada al correo: si cambia, la anterior ya no sirve para registrarse.
                if (identidadVerificada && nuevo.trim() != sesionRegistro.correo) {
                    identidadVerificada = false
                    sesionRegistro.reiniciar()
                }
                registroViewModel.onCorreoCambiado(nuevo)
            },
            onContrasenaCambiada = registroViewModel::onContrasenaCambiada,
            onConfirmacionCambiada = registroViewModel::onConfirmacionCambiada,
            onCambiarVisibilidadContrasena = registroViewModel::onCambiarVisibilidadContrasena,
            onCambiarVisibilidadConfirmacion = registroViewModel::onCambiarVisibilidadConfirmacion,
            onRegistrarBiometriaClick = {
                if (registro.correoValido) {
                    motivoAdvertencia = null
                    cuentaViewModel.reiniciar()
                    sesionRegistro.correo = registro.correo.trim()
                    verificacionViewModel.reiniciar()
                    enCaptura = true
                } else {
                    registroViewModel.marcarCorreoRequerido()
                }
            },
            onRegistrarmeClick = { cuentaViewModel.registrar(registro.correo, registro.contrasena) },
            procesando = cuenta == EtapaCuenta.Procesando,
            mensajeCuenta = (cuenta as? EtapaCuenta.Fallida)?.motivo?.let(::recursoMensajeCuenta),
        )
    }
}
