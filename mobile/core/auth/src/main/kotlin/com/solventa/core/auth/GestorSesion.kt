package com.solventa.core.auth

import com.solventa.core.network.ProveedorAccessToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Orquesta el ciclo de vida de la sesión del cliente: ingreso con credenciales, confirmación de
 * MFA, restauración en silencio (p. ej. tras un desbloqueo biométrico exitoso en `core:security`)
 * y cierre de sesión. Es el único punto de la app que conoce tanto a Cognito
 * ([ClienteIdentidad]) como al almacenamiento seguro ([AlmacenSesionSegura]); expone el access
 * token vigente a `core:network` mediante [ProveedorAccessToken].
 */
class GestorSesion(
    private val clienteIdentidad: ClienteIdentidad,
    private val almacenSesionSegura: AlmacenSesionSegura,
) : ProveedorAccessToken {
    private var usuarioEnCurso: String? = null
    private val _estado = MutableStateFlow<EstadoSesion>(EstadoSesion.NoAutenticada)
    val estado: StateFlow<EstadoSesion> = _estado.asStateFlow()

    override fun actual(): String? = (_estado.value as? EstadoSesion.Autenticada)?.sesion?.accessToken

    /** Si hay un usuario guardado que se pueda intentar restaurar (ver [restaurarSesion]). */
    fun haySesionGuardada(): Boolean = almacenSesionSegura.usuarioActivo() != null

    suspend fun iniciarSesion(usuario: String, contrasena: String): ResultadoAutenticacion {
        usuarioEnCurso = usuario
        return afianzar(usuario, clienteIdentidad.autenticar(usuario, contrasena))
    }

    /** Responde al reto de MFA emitido por [iniciarSesion] cuando devuelve `CodigoMfaRequerido`. */
    suspend fun confirmarCodigoMfa(codigo: String): ResultadoAutenticacion {
        val usuario = usuarioEnCurso
            ?: return ResultadoAutenticacion.ErrorDesconocido("No hay un ingreso en curso")
        return afianzar(usuario, clienteIdentidad.confirmarCodigoMfa(codigo))
    }

    /**
     * Intenta restaurar en silencio la sesión del último usuario autenticado en este
     * dispositivo. Pensada para llamarse después de que `core:security` autorice el desbloqueo
     * biométrico; no pide usuario ni contraseña.
     */
    suspend fun restaurarSesion(): Boolean {
        val usuario = almacenSesionSegura.usuarioActivo() ?: return false
        usuarioEnCurso = usuario
        val resultado = clienteIdentidad.restaurarSesion(usuario)
        if (resultado is ResultadoAutenticacion.Exito) {
            _estado.value = EstadoSesion.Autenticada(resultado.sesion)
            return true
        }
        // La sesión en caché ya no sirve (venció el refresh token, lo revocaron, etc.):
        // se limpia para no seguir ofreciendo un desbloqueo biométrico que va a fallar.
        almacenSesionSegura.limpiar()
        _estado.value = EstadoSesion.NoAutenticada
        return false
    }

    fun cerrarSesion() {
        usuarioEnCurso?.let(clienteIdentidad::cerrarSesion)
        almacenSesionSegura.limpiar()
        usuarioEnCurso = null
        _estado.value = EstadoSesion.NoAutenticada
    }

    private fun afianzar(usuario: String, resultado: ResultadoAutenticacion): ResultadoAutenticacion {
        if (resultado is ResultadoAutenticacion.Exito) {
            almacenSesionSegura.guardarUsuarioActivo(usuario)
            _estado.value = EstadoSesion.Autenticada(resultado.sesion)
        }
        return resultado
    }
}
