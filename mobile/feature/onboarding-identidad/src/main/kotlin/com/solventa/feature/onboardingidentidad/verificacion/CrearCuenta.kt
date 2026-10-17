package com.solventa.feature.onboardingidentidad.verificacion

import com.solventa.core.auth.ClienteRegistro
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.auth.ResultadoConfirmacion
import com.solventa.core.auth.ResultadoRegistroCuenta
import com.solventa.core.auth.ResultadoReenvioCodigo
import com.solventa.core.network.RegistroCliente
import com.solventa.core.network.ResultadoVinculacion

/** Resultado de cada paso de la creación de la cuenta; la UI decide el texto y la navegación. */
sealed class ResultadoCuenta {
    /** Cuenta creada, sesión iniciada y verificación vinculada. */
    data object Completada : ResultadoCuenta()

    /** Cognito envió un código al correo: pedirlo a la persona. */
    data object CodigoRequerido : ResultadoCuenta()

    data object CodigoReenviado : ResultadoCuenta()

    data object CodigoIncorrecto : ResultadoCuenta()

    data object CodigoVencido : ResultadoCuenta()

    /** El `tokenRegistro` falta, venció o es de otro correo: hay que verificar la identidad otra vez. */
    data object RequiereVerificar : ResultadoCuenta()

    /** El correo ya tiene cuenta (o el registro ya fue tomado): mandar a iniciar sesión. */
    data object CuentaExistente : ResultadoCuenta()

    data object ContrasenaInvalida : ResultadoCuenta()

    data object IntentosExcedidos : ResultadoCuenta()

    /** La cuenta quedó creada y confirmada, pero el ingreso falló: iniciar sesión de forma manual. */
    data object IngresoPendiente : ResultadoCuenta()

    /** Falló solo la vinculación (503 o sin red): reintentar no crea nada nuevo. */
    data object VinculacionPendiente : ResultadoCuenta()

    data object SinConexion : ResultadoCuenta()

    data class Error(val correlationId: String? = null) : ResultadoCuenta()
}

/**
 * Crea la cuenta después de verificar la identidad: SignUp con el `tokenRegistro`, confirmación del
 * correo, ingreso y vinculación del registro con la cuenta. Con [modoLocal] (solo debug contra el
 * backend local) no hay Cognito: `/validaciones` simula el pre sign-up y la vinculación usa el `sub`
 * local. La contraseña solo se conserva en memoria hasta terminar o fallar.
 */
class CrearCuenta(
    private val clienteRegistro: ClienteRegistro,
    private val gestorSesion: GestorSesion,
    private val registroCliente: RegistroCliente,
    private val sesion: SesionRegistro,
    private val modoLocal: Boolean = false,
) {
    private var contrasena: String? = null

    suspend fun registrar(correo: String, contrasena: String): ResultadoCuenta {
        val token = sesion.tokenRegistro ?: return ResultadoCuenta.RequiereVerificar
        val correoLimpio = correo.trim()
        if (modoLocal) {
            if (!registroCliente.validarLocal(token, correoLimpio)) return ResultadoCuenta.RequiereVerificar
            return vincular()
        }
        this.contrasena = contrasena
        val resultado = when (val r = clienteRegistro.registrar(correoLimpio, contrasena, token)) {
            is ResultadoRegistroCuenta.Creada -> if (r.confirmada) ingresar(correoLimpio) else ResultadoCuenta.CodigoRequerido
            ResultadoRegistroCuenta.TokenRegistroRechazado -> ResultadoCuenta.RequiereVerificar
            ResultadoRegistroCuenta.CorreoYaRegistrado -> ResultadoCuenta.CuentaExistente
            ResultadoRegistroCuenta.ContrasenaInvalida -> ResultadoCuenta.ContrasenaInvalida
            ResultadoRegistroCuenta.IntentosExcedidos -> ResultadoCuenta.IntentosExcedidos
            is ResultadoRegistroCuenta.SinConexion -> ResultadoCuenta.SinConexion
            is ResultadoRegistroCuenta.ErrorDesconocido -> ResultadoCuenta.Error()
        }
        if (resultado != ResultadoCuenta.CodigoRequerido && resultado != ResultadoCuenta.VinculacionPendiente) olvidarContrasena()
        return resultado
    }

    suspend fun confirmar(correo: String, codigo: String): ResultadoCuenta = when (
        clienteRegistro.confirmar(correo.trim(), codigo.trim())
    ) {
        ResultadoConfirmacion.Confirmada -> ingresar(correo.trim()).also { terminarSiNoPendiente(it) }
        ResultadoConfirmacion.CodigoIncorrecto -> ResultadoCuenta.CodigoIncorrecto
        ResultadoConfirmacion.CodigoVencido -> ResultadoCuenta.CodigoVencido
        ResultadoConfirmacion.IntentosExcedidos -> ResultadoCuenta.IntentosExcedidos
        is ResultadoConfirmacion.SinConexion -> ResultadoCuenta.SinConexion
        is ResultadoConfirmacion.ErrorDesconocido -> ResultadoCuenta.Error()
    }

    suspend fun reenviarCodigo(correo: String): ResultadoCuenta = when (clienteRegistro.reenviarCodigo(correo.trim())) {
        ResultadoReenvioCodigo.Enviado -> ResultadoCuenta.CodigoReenviado
        ResultadoReenvioCodigo.IntentosExcedidos -> ResultadoCuenta.IntentosExcedidos
        is ResultadoReenvioCodigo.SinConexion -> ResultadoCuenta.SinConexion
        is ResultadoReenvioCodigo.ErrorDesconocido -> ResultadoCuenta.Error()
    }

    /** Reintenta solo la vinculación, con la sesión ya iniciada. */
    suspend fun reintentarVinculacion(): ResultadoCuenta = vincular().also { terminarSiNoPendiente(it) }

    fun olvidarContrasena() {
        contrasena = null
    }

    private suspend fun ingresar(correo: String): ResultadoCuenta {
        val clave = contrasena ?: return ResultadoCuenta.IngresoPendiente
        return when (gestorSesion.iniciarSesion(correo, clave)) {
            is ResultadoAutenticacion.Exito -> vincular()
            else -> ResultadoCuenta.IngresoPendiente
        }
    }

    private suspend fun vincular(): ResultadoCuenta {
        val token = sesion.tokenRegistro ?: return ResultadoCuenta.RequiereVerificar
        return when (val r = registroCliente.vincular(sesion.registroId, token)) {
            is ResultadoVinculacion.Vinculada -> ResultadoCuenta.Completada
            is ResultadoVinculacion.TokenInvalido -> ResultadoCuenta.RequiereVerificar
            is ResultadoVinculacion.YaVinculado -> ResultadoCuenta.CuentaExistente
            is ResultadoVinculacion.ServicioNoDisponible, ResultadoVinculacion.SinConexion -> ResultadoCuenta.VinculacionPendiente
            is ResultadoVinculacion.NoAutenticado -> ResultadoCuenta.Error(r.correlationId)
            is ResultadoVinculacion.ErrorDesconocido -> ResultadoCuenta.Error(r.correlationId)
        }
    }

    private fun terminarSiNoPendiente(resultado: ResultadoCuenta) {
        if (resultado != ResultadoCuenta.VinculacionPendiente) olvidarContrasena()
    }
}
