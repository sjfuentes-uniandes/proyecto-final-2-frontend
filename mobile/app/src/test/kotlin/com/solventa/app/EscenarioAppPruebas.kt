package com.solventa.app

import android.os.Looper
import com.solventa.core.auth.AlmacenSesionSegura
import com.solventa.core.auth.ClienteIdentidad
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.auth.SesionAuth
import com.solventa.feature.notificaciones.AlmacenDispositivo
import com.solventa.feature.notificaciones.NotificacionesSinConfigurar
import com.solventa.feature.notificaciones.ProveedorTokenPush
import java.util.concurrent.ConcurrentLinkedQueue
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.robolectric.Shadows.shadowOf

const val TOKEN_ID_SESION = "id-token-sintetico"
const val TOKEN_PUSH = "token-push-sintetico"
const val DISPOSITIVO_ID = "22222222-2222-2222-2222-222222222222"

/** Una sola API simulada por JVM: la URL base se necesita al crear la aplicación, antes de cualquier `@Before`. */
object ApiSimulada {
    private val servidor = MockWebServer().apply { start() }
    val url: String = servidor.url("/").toString()
    val recibidas = ConcurrentLinkedQueue<RecordedRequest>()

    fun reiniciar(respuesta: (RecordedRequest) -> MockResponse) {
        recibidas.clear()
        servidor.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                recibidas += request
                return respuesta(request)
            }
        }
    }

    fun recibidas(metodo: String, ruta: String) =
        recibidas.filter { it.method == metodo && it.path?.substringBefore('?') == ruta }
}

class IdentidadSimulada : ClienteIdentidad {
    override suspend fun autenticar(usuario: String, contrasena: String) = exito

    override suspend fun confirmarCodigoMfa(codigo: String) = exito

    override suspend fun restaurarSesion(usuario: String) = exito

    override fun cerrarSesion(usuario: String) = Unit

    private val exito = ResultadoAutenticacion.Exito(SesionAuth("access-sintetico", TOKEN_ID_SESION, Long.MAX_VALUE))
}

class AlmacenSesionEnMemoria : AlmacenSesionSegura {
    private var usuario: String? = "persona@ejemplo.co"

    override fun guardarUsuarioActivo(usuario: String) {
        this.usuario = usuario
    }

    override fun usuarioActivo() = usuario

    override fun limpiar() {
        usuario = null
    }
}

class AlmacenDispositivoEnMemoria(@Volatile var id: String? = null) : AlmacenDispositivo {
    override fun leer() = id

    override fun guardar(dispositivoId: String) {
        id = dispositivoId
    }

    override fun borrar() {
        id = null
    }
}

/** Aplicación de pruebas: sin Keystore, sin Cognito ni Firebase reales, y con el BFF apuntando a [ApiSimulada]. */
open class AppSimulada(private val proveedor: ProveedorTokenPush) : SolventaApp() {
    val almacenDispositivo = AlmacenDispositivoEnMemoria()

    override fun configuracionFirebase() =
        com.solventa.feature.notificaciones.ConfiguracionFirebase("", "", "", "")

    override fun urlBaseBff() = ApiSimulada.url

    override fun crearClienteIdentidad(): ClienteIdentidad = IdentidadSimulada()

    override fun crearAlmacenSesion(): AlmacenSesionSegura = AlmacenSesionEnMemoria()

    override fun crearAlmacenDispositivo(): AlmacenDispositivo = almacenDispositivo

    override fun crearProveedorTokenPush(): ProveedorTokenPush = proveedor
}

class AppSimuladaConToken : AppSimulada({ TOKEN_PUSH })

class AppSimuladaSinConfigurar : AppSimulada(NotificacionesSinConfigurar)

/** Espera (con el hilo principal de Robolectric en marcha) a que se cumpla [condicion]. */
fun esperarHasta(maxMs: Long = 5_000, condicion: () -> Boolean): Boolean {
    val limite = System.currentTimeMillis() + maxMs
    while (System.currentTimeMillis() < limite) {
        shadowOf(Looper.getMainLooper()).idle()
        if (condicion()) return true
        Thread.sleep(25)
    }
    return condicion()
}
