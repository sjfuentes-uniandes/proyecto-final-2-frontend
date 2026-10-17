package com.solventa.feature.onboardingidentidad.verificacion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import app.cash.turbine.test
import com.solventa.core.network.ResultadoVerificacionRegistro as ResultadoVerificacion
import com.solventa.feature.onboardingidentidad.captura.CondicionCaptura
import com.solventa.feature.onboardingidentidad.captura.FlujoCaptura
import com.solventa.feature.onboardingidentidad.captura.ParpadeoReto
import com.solventa.feature.onboardingidentidad.captura.PasoCaptura
import com.solventa.feature.onboardingidentidad.captura.SelfieEnMemoria
import com.solventa.feature.onboardingidentidad.captura.TipoReto
import com.solventa.feature.onboardingidentidad.captura.frame
import com.solventa.feature.onboardingidentidad.captura.rostro
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class VerificacionIdentidadViewModelTest {
    private lateinit var verificar: VerificarIdentidad
    private lateinit var viewModel: VerificacionIdentidadViewModel

    private val aprobada = ResultadoVerificacion.Verificada(clienteId = "cliente-1", tokenRegistro = "v1.token", expiraEn = null)

    @Before
    fun preparar() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        verificar = mockk()
        viewModel = nuevoViewModel()
    }

    @After
    fun terminar() {
        Dispatchers.resetMain()
    }

    private fun nuevoViewModel() = VerificacionIdentidadViewModel(
        verificarIdentidad = verificar,
        flujo = FlujoCaptura(elegirReto = { ParpadeoReto() }),
    )

    private fun nuevaSelfie() = SelfieEnMemoria(ByteArray(8) { 1 })

    /** Concede el permiso y cumple el parpadeo; devuelve lo que respondió el último cuadro. */
    private fun capturarHastaCompletar(destino: VerificacionIdentidadViewModel = viewModel): Boolean {
        destino.onPermisoCamara(true)
        destino.onFrame(frame(tiempoMs = 0))
        destino.onFrame(frame(rostro(ojoIzquierdo = 0.05f, ojoDerecho = 0.05f), tiempoMs = 100))
        return destino.onFrame(frame(tiempoMs = 200))
    }

    @Test
    fun `empieza pendiente de permiso y no captura nada sin camara`() {
        assertEquals(EtapaVerificacion.PermisoPendiente, viewModel.etapa.value)
        assertFalse(viewModel.onFrame(frame()))
    }

    @Test
    fun `sin permiso queda denegado y puede concederse despues`() = runTest {
        viewModel.etapa.test {
            assertEquals(EtapaVerificacion.PermisoPendiente, awaitItem())

            viewModel.onPermisoCamara(false)
            assertEquals(EtapaVerificacion.PermisoDenegado, awaitItem())

            viewModel.onPermisoCamara(true)
            assertEquals(EtapaVerificacion.Capturando(), awaitItem())
        }
    }

    @Test
    fun `con permiso la guia en vivo refleja lo que hay que corregir y luego el reto`() = runTest {
        viewModel.onPermisoCamara(true)

        viewModel.etapa.test {
            assertEquals(EtapaVerificacion.Capturando(), awaitItem())

            assertFalse(viewModel.onFrame(frame(luminosidad = 10f)))
            assertEquals(
                EtapaVerificacion.Capturando(PasoCaptura.Guia(CondicionCaptura.ILUMINACION_INSUFICIENTE)),
                awaitItem(),
            )

            assertFalse(viewModel.onFrame(frame(tiempoMs = 100)))
            assertEquals(EtapaVerificacion.Capturando(PasoCaptura.Reto(TipoReto.PARPADEO)), awaitItem())
        }
    }

    @Test
    fun `el cuadro a capturar se pide una sola vez`() {
        assertTrue(capturarHastaCompletar())

        assertFalse(viewModel.onFrame(frame(tiempoMs = 300)))
        assertFalse(viewModel.onFrame(frame(tiempoMs = 400)))
    }

    @Test
    fun `AC1 identidad aprobada envia la prueba de vida completada y borra la selfie`() = runTest {
        coEvery { verificar(any(), any()) } returns aprobada
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.etapa.test {
            assertEquals(EtapaVerificacion.Capturando(PasoCaptura.Completado), awaitItem())

            viewModel.onSelfieCapturada(selfie)

            assertEquals(EtapaVerificacion.Enviando, awaitItem())
            assertEquals(EtapaVerificacion.Aprobada("cliente-1"), awaitItem())
        }
        coVerify(exactly = 1) { verificar(selfie, true) }
        assertTrue(selfie.estaLimpia)
    }

    @Test
    fun `AC2 captura invalida pide repetir, no es rechazo y borra la selfie`() = runTest {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.CapturaInvalida("ILUMINACION_INSUFICIENTE")
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.onSelfieCapturada(selfie)

        assertEquals(EtapaVerificacion.CapturaInvalida(MotivoCapturaInvalida.ILUMINACION_INSUFICIENTE), viewModel.etapa.value)
        assertTrue(selfie.estaLimpia)

        viewModel.repetirCaptura()
        assertEquals(EtapaVerificacion.Capturando(), viewModel.etapa.value)
    }

    @Test
    fun `un motivo desconocido de captura invalida cae en OTRO`() {
        assertEquals(MotivoCapturaInvalida.OTRO, MotivoCapturaInvalida.desde("MOTIVO_NUEVO"))
        assertEquals(MotivoCapturaInvalida.OTRO, MotivoCapturaInvalida.desde(null))
    }

    @Test
    fun `una selfie que no cupo en el limite se trata como captura invalida`() {
        capturarHastaCompletar()

        viewModel.onSelfieCapturada(null)

        assertEquals(EtapaVerificacion.CapturaInvalida(MotivoCapturaInvalida.OTRO), viewModel.etapa.value)
    }

    @Test
    fun `un rechazo informa el motivo, borra la selfie y permite volver a intentar`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.Rechazada("ROSTRO_NO_COINCIDE")
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.onSelfieCapturada(selfie)

        assertEquals(EtapaVerificacion.Rechazada(MotivoRechazo.ROSTRO_NO_COINCIDE), viewModel.etapa.value)
        assertTrue(selfie.estaLimpia)

        viewModel.repetirCaptura()
        assertEquals(EtapaVerificacion.Capturando(), viewModel.etapa.value)
    }

    @Test
    fun `AC3 una interrupcion conserva la selfie y reintentar reenvia la misma`() = runTest {
        coEvery { verificar(any(), any()) } returnsMany listOf(
            ResultadoVerificacion.ServicioNoDisponible(correlationId = "corr-1"),
            aprobada,
        )
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.etapa.test {
            skipItems(1) // Capturando(Completado)

            viewModel.onSelfieCapturada(selfie)
            assertEquals(EtapaVerificacion.Enviando, awaitItem())
            assertEquals(EtapaVerificacion.Interrumpida("corr-1"), awaitItem())
            assertFalse(selfie.estaLimpia)

            viewModel.reintentar()
            assertEquals(EtapaVerificacion.Enviando, awaitItem())
            assertEquals(EtapaVerificacion.Aprobada("cliente-1"), awaitItem())
        }
        coVerify(exactly = 2) { verificar(selfie, true) }
        assertTrue(selfie.estaLimpia)
    }

    @Test
    fun `AC3 sin conexion tambien es una interrupcion recuperable`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.SinConexion
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.onSelfieCapturada(selfie)

        assertEquals(EtapaVerificacion.Interrumpida(correlationId = null), viewModel.etapa.value)
        assertFalse(selfie.estaLimpia)
    }

    @Test
    fun `AC4 cancelar tras una interrupcion borra la selfie`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.SinConexion
        val selfie = nuevaSelfie()
        capturarHastaCompletar()
        viewModel.onSelfieCapturada(selfie)

        viewModel.cancelar()

        assertTrue(selfie.estaLimpia)
        assertEquals(EtapaVerificacion.Cancelada, viewModel.etapa.value)
    }

    @Test
    fun `AC4 cancelar durante el envio borra la selfie e ignora el resultado tardio`() {
        val respuesta = CompletableDeferred<ResultadoVerificacion>()
        coEvery { verificar(any(), any()) } coAnswers { respuesta.await() }
        val selfie = nuevaSelfie()
        capturarHastaCompletar()
        viewModel.onSelfieCapturada(selfie)
        assertEquals(EtapaVerificacion.Enviando, viewModel.etapa.value)

        viewModel.cancelar()
        respuesta.complete(aprobada)

        assertTrue(selfie.estaLimpia)
        assertEquals(EtapaVerificacion.Cancelada, viewModel.etapa.value)
    }

    @Test
    fun `AC4 una selfie que llega despues de cancelar se borra al instante`() {
        capturarHastaCompletar()
        viewModel.cancelar()
        val tardia = nuevaSelfie()

        viewModel.onSelfieCapturada(tardia)

        assertTrue(tardia.estaLimpia)
        assertEquals(EtapaVerificacion.Cancelada, viewModel.etapa.value)
    }

    @Test
    fun `AC4 al destruirse el ViewModel borra la selfie que conservaba`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.SinConexion
        val tienda = ViewModelStore()
        ViewModelProvider(
            tienda,
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T = viewModel as T
            },
        )[VerificacionIdentidadViewModel::class.java]
        val selfie = nuevaSelfie()
        capturarHastaCompletar()
        viewModel.onSelfieCapturada(selfie)
        assertFalse(selfie.estaLimpia)

        tienda.clear()

        assertTrue(selfie.estaLimpia)
    }

    @Test
    fun `un correo distinto al de la verificacion pide verificar de nuevo y borra la selfie`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.CorreoDistinto(correlationId = null)
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.onSelfieCapturada(selfie)

        assertEquals(EtapaVerificacion.CorreoDistinto, viewModel.etapa.value)
        assertTrue(selfie.estaLimpia)
    }

    @Test
    fun `un correo que ya tiene cuenta manda a iniciar sesion y borra la selfie`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.YaVinculado(correlationId = null)
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.onSelfieCapturada(selfie)

        assertEquals(EtapaVerificacion.CuentaExistente, viewModel.etapa.value)
        assertTrue(selfie.estaLimpia)
    }

    @Test
    fun `demasiados intentos es una interrupcion recuperable que conserva la selfie`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.DemasiadosIntentos(correlationId = "corr-429")
        val selfie = nuevaSelfie()
        capturarHastaCompletar()

        viewModel.onSelfieCapturada(selfie)

        assertEquals(EtapaVerificacion.Interrumpida("corr-429"), viewModel.etapa.value)
        assertFalse(selfie.estaLimpia)
    }

    @Test
    fun `una solicitud invalida o un error desconocido conservan el correlationId para soporte`() {
        coEvery { verificar(any(), any()) } returnsMany listOf(
            ResultadoVerificacion.SolicitudInvalida(correlationId = "corr-422"),
            ResultadoVerificacion.ErrorDesconocido(correlationId = "corr-500"),
        )

        val primera = nuevaSelfie()
        capturarHastaCompletar()
        viewModel.onSelfieCapturada(primera)
        assertEquals(EtapaVerificacion.ErrorInesperado("corr-422"), viewModel.etapa.value)
        assertTrue(primera.estaLimpia)

        val segunda = nuevaSelfie()
        viewModel.reintentar() // fuera de una interrupcion: vuelve a capturar
        viewModel.onFrame(frame(tiempoMs = 0))
        viewModel.onFrame(frame(rostro(ojoIzquierdo = 0.05f, ojoDerecho = 0.05f), tiempoMs = 100))
        viewModel.onFrame(frame(tiempoMs = 200))
        viewModel.onSelfieCapturada(segunda)
        assertEquals(EtapaVerificacion.ErrorInesperado("corr-500"), viewModel.etapa.value)
        assertTrue(segunda.estaLimpia)
    }

    @Test
    fun `repetir la captura no se permite mientras se esta enviando`() {
        val respuesta = CompletableDeferred<ResultadoVerificacion>()
        coEvery { verificar(any(), any()) } coAnswers { respuesta.await() }
        val selfie = nuevaSelfie()
        capturarHastaCompletar()
        viewModel.onSelfieCapturada(selfie)

        viewModel.repetirCaptura()

        assertEquals(EtapaVerificacion.Enviando, viewModel.etapa.value)
        assertFalse(selfie.estaLimpia)
    }

    @Test
    fun `reiniciar vuelve a pedir el permiso, borra la selfie y permite capturar de nuevo`() {
        coEvery { verificar(any(), any()) } returns ResultadoVerificacion.SinConexion
        val selfie = nuevaSelfie()
        capturarHastaCompletar()
        viewModel.onSelfieCapturada(selfie)

        viewModel.reiniciar()

        assertTrue(selfie.estaLimpia)
        assertEquals(EtapaVerificacion.PermisoPendiente, viewModel.etapa.value)
        assertTrue(capturarHastaCompletar())
    }

    @Test
    fun `si la camara no se puede abrir se informa un error y se puede volver a intentar`() {
        viewModel.onPermisoCamara(true)

        viewModel.onCamaraNoDisponible()

        assertEquals(EtapaVerificacion.ErrorInesperado(correlationId = null), viewModel.etapa.value)
        viewModel.repetirCaptura()
        assertEquals(EtapaVerificacion.Capturando(), viewModel.etapa.value)
    }

    @Test
    fun `un fallo de camara fuera de la captura se ignora`() {
        viewModel.onCamaraNoDisponible()

        assertEquals(EtapaVerificacion.PermisoPendiente, viewModel.etapa.value)
    }
}
