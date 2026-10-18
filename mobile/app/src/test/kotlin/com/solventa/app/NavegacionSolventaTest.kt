package com.solventa.app

import android.app.Application
import android.content.Context
import androidx.activity.compose.setContent
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onLast
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.test.core.app.ApplicationProvider
import com.solventa.core.auth.AlmacenSesionSegura
import com.solventa.core.auth.ClienteIdentidad
import com.solventa.core.auth.ClienteRegistro
import com.solventa.core.auth.GestorSesion
import com.solventa.core.auth.ResultadoAutenticacion
import com.solventa.core.auth.ResultadoRegistroCuenta
import com.solventa.core.auth.SesionAuth
import com.solventa.core.network.BffMovilApi
import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.RegistroCliente
import com.solventa.core.network.modelo.SesionDto
import com.solventa.core.security.GestorBiometria
import com.solventa.feature.login.LoginViewModel
import com.solventa.feature.login.LoginViewModelFactory
import com.solventa.feature.onboardingidentidad.verificacion.CrearCuenta
import com.solventa.feature.onboardingidentidad.verificacion.CuentaViewModel
import com.solventa.feature.onboardingidentidad.verificacion.CuentaViewModelFactory
import com.solventa.feature.onboardingidentidad.verificacion.SesionRegistro
import com.solventa.feature.onboardingidentidad.verificacion.VerificacionIdentidadViewModelFactory
import com.solventa.feature.onboardingidentidad.verificacion.VerificarIdentidad
import com.solventa.feature.privacidad.EtiquetasPrueba
import com.solventa.feature.privacidad.PrivacidadViewModelFactory
import com.solventa.feature.privacidad.dominio.AccionBiometrica
import com.solventa.feature.privacidad.dominio.Alcance
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Hito
import com.solventa.feature.privacidad.dominio.Otorgamiento
import com.solventa.feature.privacidad.dominio.Permiso
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.TextoVigente
import com.solventa.feature.privacidad.dominio.TipoHito
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import retrofit2.Response
import java.time.Instant
import com.solventa.feature.login.R as RLogin
import com.solventa.feature.onboardingidentidad.R as ROnboarding
import com.solventa.feature.privacidad.R as RPrivacidad

/**
 * Navegación de la app tal como la compone [MainActivity] ([ContenidoSolventa]), con los
 * ViewModel y las pantallas reales; solo la red, Cognito, el almacén seguro y la biometría de
 * Privacidad son dobles. `Application` simple: [SolventaApp] crearía los clientes reales. Pantalla
 * de teléfono (411×891 dp): la de Robolectric por defecto (320×470) recorta el formulario de ingreso.
 */
@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, qualifiers = "es-rCO-w411dp-h891dp")
class NavegacionSolventaTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private val contexto: Context = ApplicationProvider.getApplicationContext()
    private fun texto(id: Int) = contexto.getString(id)

    private val api = mockk<BffMovilApi>().also {
        coEvery { it.sesion() } returns Response.success(SesionDto("cliente-sintetico", emptyList(), "2026-10-18T00:00:00Z"))
    }
    private val clienteIdentidad = object : ClienteIdentidad {
        override suspend fun autenticar(usuario: String, contrasena: String) =
            ResultadoAutenticacion.Exito(SesionAuth("access-sintetico", "id-sintetico", Long.MAX_VALUE))

        override suspend fun confirmarCodigoMfa(codigo: String) = ResultadoAutenticacion.ErrorDesconocido("no aplica")

        override suspend fun restaurarSesion(usuario: String) = ResultadoAutenticacion.ErrorDesconocido("no aplica")

        override fun cerrarSesion(usuario: String) = Unit
    }
    private val almacen = object : AlmacenSesionSegura {
        private var usuario: String? = null

        override fun guardarUsuarioActivo(usuario: String) {
            this.usuario = usuario
        }

        override fun usuarioActivo() = usuario

        override fun limpiar() {
            usuario = null
        }
    }
    private val clienteRegistro = mockk<ClienteRegistro>()
    private val repositorio = RepositorioEnMemoria()
    private val acciones = mutableListOf<AccionBiometrica>()
    private val verificador = VerificadorBiometrico { accion ->
        acciones += accion
        ConfirmacionBiometrica.CONFIRMADA
    }
    private val sesionRegistro = SesionRegistro()
    private val creados = mutableMapOf<Class<*>, MutableList<ViewModel>>()

    /** Cuenta y guarda cada ViewModel que crea la navegación, para comprobar cuántos hay. */
    private fun contando(real: ViewModelProvider.Factory) = object : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            real.create(modelClass).also { creados.getOrPut(modelClass) { mutableListOf() } += it }
    }

    private fun montar(): FragmentActivity {
        val actividad = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        val gestorSesion = GestorSesion(clienteIdentidad, almacen)
        val gestorBiometria = GestorBiometria(actividad)
        val registroCliente = RegistroCliente(api)
        val dependencias = DependenciasNavegacion(
            fabricaLogin = contando(LoginViewModelFactory(gestorSesion, gestorBiometria, BffMovilCliente(api))),
            gestorBiometria = gestorBiometria,
            fabricaPrivacidad = contando(PrivacidadViewModelFactory(repositorio, verificador)),
            fabricaVerificacion = contando(VerificacionIdentidadViewModelFactory(VerificarIdentidad(registroCliente, sesionRegistro))),
            fabricaCuenta = contando(CuentaViewModelFactory(CrearCuenta(clienteRegistro, gestorSesion, registroCliente, sesionRegistro))),
            sesionRegistro = sesionRegistro,
        )
        actividad.setContent { ContenidoSolventa(dependencias, actividad) }
        compose.waitForIdle()
        return actividad
    }

    // Si hubiera más de un login, se actúa sobre el último compuesto: es el que queda encima y el
    // que la persona ve y toca. Así (b) y (c) prueban la navegación; la ambigüedad la cubre (a).
    private fun pulsarEnLoginVisible(id: Int) {
        compose.onAllNodesWithText(texto(id)).onLast().performClick()
        compose.waitForIdle()
    }

    private fun ingresar() {
        val campos = compose.onAllNodes(hasSetTextAction())
        val total = campos.fetchSemanticsNodes().size
        campos[total - 2].performTextInput("persona@ejemplo.co")
        campos[total - 1].performTextInput("Clave-sintetica-1")
        pulsarEnLoginVisible(RLogin.string.login_boton_ingresar)
    }

    @Test
    fun `(a) al abrir la app hay exactamente un login`() {
        montar()

        compose.onAllNodesWithText(texto(RLogin.string.login_boton_ingresar)).assertCountEquals(1)
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(2)
    }

    @Test
    fun `(b) Registrarme abre el registro de identidad`() {
        montar()

        pulsarEnLoginVisible(RLogin.string.login_registrarme)

        compose.onNodeWithText(texto(ROnboarding.string.onboarding_registro_titulo)).assertExists().assertIsDisplayed()
    }

    @Test
    fun `(c) un ingreso exitoso lleva a Privacidad y saca el login de la pila`() {
        montar()

        ingresar()

        compose.onNodeWithText(texto(RPrivacidad.string.privacidad_lista_titulo)).assertExists().assertIsDisplayed()
        compose.onAllNodes(hasText(texto(RLogin.string.login_boton_ingresar))).assertCountEquals(0)
        assertEquals(1, creados[LoginViewModel::class.java]?.size)
    }

    @Test
    fun `(d) Aceptar en el fin del registro vuelve al ingreso, como en main`() {
        // El botón de crear la cuenta exige la verificación con cámara (CameraX no corre en
        // Robolectric): con un token ya guardado se llama al ViewModel real de la ruta, como ese botón.
        coEvery { clienteRegistro.registrar(any(), any(), any()) } returns ResultadoRegistroCuenta.CorreoYaRegistrado
        sesionRegistro.guardarToken("token-registro-sintetico")
        montar()
        pulsarEnLoginVisible(RLogin.string.login_registrarme)

        val cuenta = creados.getValue(CuentaViewModel::class.java).single() as CuentaViewModel
        cuenta.registrar("persona@ejemplo.co", "Clave-sintetica-1")
        compose.waitForIdle()
        compose.onNodeWithText(texto(R.string.cuenta_existente_titulo)).assertIsDisplayed()
        compose.onNodeWithText(texto(R.string.cuenta_creada_aceptar)).performClick()
        compose.waitForIdle()

        compose.onNodeWithText(texto(R.string.cuenta_existente_titulo)).assertDoesNotExist()
        compose.onNodeWithText(texto(ROnboarding.string.onboarding_registro_titulo)).assertDoesNotExist()
        compose.onAllNodesWithText(texto(RLogin.string.login_boton_ingresar)).assertCountEquals(1)
        // Es el mismo ingreso de la pila: en main era el mismo ViewModel, con alcance de la actividad.
        assertEquals(1, creados.getValue(LoginViewModel::class.java).size)
    }

    @Test
    fun `atras desde el formulario de registro vuelve al ingreso, como el BackHandler de main`() {
        val actividad = montar()
        pulsarEnLoginVisible(RLogin.string.login_registrarme)

        actividad.onBackPressedDispatcher.onBackPressed()
        compose.waitForIdle()

        compose.onNodeWithText(texto(ROnboarding.string.onboarding_registro_titulo)).assertDoesNotExist()
        compose.onAllNodesWithText(texto(RLogin.string.login_boton_ingresar)).assertCountEquals(1)
        assertEquals(1, creados.getValue(LoginViewModel::class.java).size)
    }

    @Test
    fun `(e) M08 y M09 desde la app - otorgar deja ACTIVA, revocar deja REVOCADA y el historial lo registra`() {
        montar()
        ingresar()
        compose.onNodeWithTag(EtiquetasPrueba.permiso(Permiso.OPEN_FINANCE_OPEN_DATA.name)).performClick()
        compose.waitForIdle()

        // M08: otorgar con biometría confirmada.
        compose.onNodeWithTag(EtiquetasPrueba.alcance(Alcance.FA_PRODUCTOS_VIGENTES.name)).performScrollTo().performClick()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_OTORGAR).performScrollTo().performClick()
        compose.waitForIdle()
        compose.onNodeWithTag(EtiquetasPrueba.COMPROBANTE).assertExists()
        compose.onNodeWithText(texto(RPrivacidad.string.privacidad_estado_activa)).performScrollTo().assertIsDisplayed()

        // M09: revocar desde el mismo comprobante, con la confirmación explícita y la biometría.
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).performScrollTo().performClick()
        compose.onNodeWithText(texto(RPrivacidad.string.privacidad_revocar_confirmar_si)).performClick()
        compose.waitForIdle()

        compose.onNodeWithText(texto(RPrivacidad.string.privacidad_estado_revocada)).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Revocada: 2 de noviembre de 2026", substring = true).performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag(EtiquetasPrueba.BOTON_REVOCAR).assertDoesNotExist()
        assertEquals(listOf(AccionBiometrica.OTORGAR, AccionBiometrica.REVOCAR), acciones)
        assertEquals(EstadoConsentimiento.REVOCADO, repositorio.actual?.estado)
    }
}

/** Repositorio con estado: lo que se otorga o revoca es lo que después listan el detalle y el historial. */
private class RepositorioEnMemoria : RepositorioConsentimientos {
    var actual: Consentimiento? = null
        private set

    override suspend fun listar(): Resultado<List<Consentimiento>> = Resultado.Exito(listOfNotNull(actual))

    override suspend fun detalle(id: String): Resultado<Consentimiento> = Resultado.Exito(requireNotNull(actual))

    override suspend fun textoVigente(proposito: String, idioma: String): Resultado<TextoVigente> = Resultado.Exito(TEXTO)

    override suspend fun otorgar(solicitud: SolicitudOtorgamiento, clave: String): Resultado<Otorgamiento> {
        actual = ACTIVO
        return Resultado.Exito(Otorgamiento(ACTIVO, repeticion = false))
    }

    override suspend fun revocar(id: String): Resultado<Consentimiento> {
        actual = REVOCADO
        return Resultado.Exito(REVOCADO)
    }

    override suspend fun historial(id: String): Resultado<Historial> {
        val consentimiento = requireNotNull(actual)
        val hitos = listOfNotNull(
            Hito(TipoHito.OTORGADO, consentimiento.otorgadoEn),
            consentimiento.revocadoEn?.let { Hito(TipoHito.REVOCADO, it) },
        )
        return Resultado.Exito(Historial(id, consentimiento.estado, hitos))
    }

    private companion object {
        val TEXTO = TextoVigente("PERFILAMIENTO_PRECIO", "es-CO", "2026-10-17.1", "Título", "Cuerpo", "Aviso", listOf(6, 12), 12)
        val ACTIVO = Consentimiento(
            id = "c-sintetico-1",
            estado = EstadoConsentimiento.ACTIVO,
            proposito = "PERFILAMIENTO_PRECIO",
            alcances = listOf("FA_PRODUCTOS_VIGENTES"),
            versionTexto = "2026-10-17.1",
            idioma = "es-CO",
            otorgadoEn = Instant.parse("2026-10-17T15:00:00Z"),
            vigenteHasta = Instant.parse("2027-10-17T23:59:59Z"),
            revocadoEn = null,
        )
        val REVOCADO = ACTIVO.copy(estado = EstadoConsentimiento.REVOCADO, revocadoEn = Instant.parse("2026-11-02T15:15:00Z"))
    }
}
