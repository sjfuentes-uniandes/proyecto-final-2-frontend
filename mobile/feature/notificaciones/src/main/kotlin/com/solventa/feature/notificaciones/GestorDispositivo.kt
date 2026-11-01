package com.solventa.feature.notificaciones

import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.ResultadoBajaDispositivo
import com.solventa.core.network.ResultadoDispositivo
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Puerto de red del registro de dispositivos. */
interface RedDispositivos {
    suspend fun registrar(tokenPush: String): ResultadoDispositivo

    /** [autorizacion] explícita: la baja puede ocurrir cuando la sesión ya se limpió. */
    suspend fun darDeBaja(dispositivoId: String, autorizacion: String?): ResultadoBajaDispositivo
}

class RedDispositivosBff(private val cliente: BffMovilCliente) : RedDispositivos {
    override suspend fun registrar(tokenPush: String) = cliente.registrarDispositivo(tokenPush)

    override suspend fun darDeBaja(dispositivoId: String, autorizacion: String?) =
        cliente.darDeBajaDispositivo(dispositivoId, autorizacion)
}

/** Puerto del almacén cifrado del `dispositivoId`. */
interface AlmacenDispositivo {
    fun leer(): String?

    fun guardar(dispositivoId: String)

    fun borrar()
}

/**
 * Registra y da de baja el dispositivo push. Es best-effort: nunca lanza ni cierra la sesión.
 * Registro y baja se serializan con un [Mutex] porque el observador de sesión y `onNewToken`
 * pueden coincidir. Ni el token push ni el `dispositivoId` se registran en logs ni en errores.
 */
class GestorDispositivo(
    private val red: RedDispositivos,
    private val proveedorToken: ProveedorTokenPush,
    private val almacen: AlmacenDispositivo,
    /** ID token de la sesión vigente, o null si no hay sesión. */
    private val tokenSesion: () -> String?,
) {
    private val mutex = Mutex()
    private var ultimoTokenRegistrado: String? = null

    /** Verdadero mientras haya un registro por hacer (sin sesión o sin token/red). */
    @Volatile
    var registroPendiente: Boolean = false
        private set

    /** Cuando la sesión pasa a Autenticada, o para reintentar un registro pendiente. */
    suspend fun registrar() {
        mutex.withLock {
            val token = proveedorToken.obtenerToken()
            if (token == null || tokenSesion() == null) {
                registroPendiente = tokenSesion() == null
                return
            }
            if (token == ultimoTokenRegistrado && almacen.leer() != null) {
                registroPendiente = false
                return
            }
            registrarConToken(token)
        }
    }

    /** FCM entregó un token nuevo: da de baja el dispositivo anterior (tolerado) y registra el nuevo. */
    suspend fun alTokenNuevo(token: String) {
        if (token.isBlank()) return
        mutex.withLock {
            val sesion = tokenSesion()
            if (sesion == null) {
                registroPendiente = true
                return
            }
            if (token == ultimoTokenRegistrado && almacen.leer() != null) return
            almacen.leer()?.let { anterior ->
                runCatchingTolerante { red.darDeBaja(anterior, autorizacion(sesion)) }
                almacen.borrar()
            }
            registrarConToken(token)
        }
    }

    /** Baja con el token capturado antes de limpiar la sesión; el `dispositivoId` local se borra siempre. */
    suspend fun darDeBaja(tokenSesionCapturado: String?) {
        mutex.withLock {
            val id = almacen.leer()
            ultimoTokenRegistrado = null
            registroPendiente = false
            if (id == null) return
            try {
                if (tokenSesionCapturado != null) {
                    runCatchingTolerante { red.darDeBaja(id, autorizacion(tokenSesionCapturado)) }
                }
            } finally {
                almacen.borrar()
            }
        }
    }

    private suspend fun registrarConToken(token: String) {
        val resultado = try {
            red.registrar(token)
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
        if (resultado is ResultadoDispositivo.Exito) {
            almacen.guardar(resultado.dispositivoId)
            ultimoTokenRegistrado = token
            registroPendiente = false
        } else {
            registroPendiente = true
        }
    }

    private suspend fun runCatchingTolerante(bloque: suspend () -> ResultadoBajaDispositivo) {
        try {
            bloque()
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            // La baja es best-effort.
        }
    }

    private fun autorizacion(sesion: String) = "Bearer $sesion"
}
