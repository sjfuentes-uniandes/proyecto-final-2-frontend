package com.solventa.feature.billetera.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.BilleteraViewModel
import com.solventa.feature.billetera.DetallePolizaViewModel
import com.solventa.feature.billetera.EtiquetasPrueba
import com.solventa.feature.billetera.casos.ConsultarPoliza
import com.solventa.feature.billetera.casos.ListarPolizas
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import kotlin.test.assertEquals

/** Las rutas conectan ViewModel y pantalla: estado, acciones y salida al login. */
@RunWith(RobolectricTestRunner::class)
@Config(qualifiers = "es-rCO-w411dp-h891dp")
class RutasBilleteraTest {
    @get:Rule
    val compose = createComposeRule()

    private val repositorio = mockk<RepositorioPolizas>()
    private val gestorSesion = mockk<GestorSesion>(relaxed = true)
    private val abiertas = mutableListOf<String>()
    private var login = 0
    private var privacidad = 0
    private var volver = 0

    private fun lista() = BilleteraViewModel(ListarPolizas(repositorio), gestorSesion)

    private fun detalle() = DetallePolizaViewModel("id-1", ConsultarPoliza(repositorio), gestorSesion)

    private fun montarLista() = compose.montar {
        BilleteraRoute(lista(), { abiertas += it }, { privacidad++ }, { login++ })
    }

    private fun montarDetalle() = compose.montar {
        DetallePolizaRoute(detalle(), { volver++ }, { login++ })
    }

    @Test
    fun `lista - muestra las polizas y abre la elegida`() {
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(Muestras.activa))
        montarLista()
        compose.waitForIdle()

        compose.onNodeWithTag(EtiquetasPrueba.poliza(Muestras.activa.polizaId)).performClick()
        assertEquals(listOf(Muestras.activa.polizaId), abiertas)
    }

    @Test
    fun `lista - reintentar vuelve a consultar y el acceso a privacidad avisa`() {
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloPolizas.SinConexion)
        montarLista()
        compose.waitForIdle()

        compose.onNodeWithText("Reintentar").assertIsDisplayed()
        coEvery { repositorio.listar() } returns Resultado.Exito(listOf(Muestras.activa))
        compose.onNodeWithText("Reintentar").performClick()
        compose.waitForIdle()
        compose.onNodeWithText("Seguro de Vida").assertIsDisplayed()

        compose.onNodeWithTag(EtiquetasPrueba.ACCESO_PRIVACIDAD).performClick()
        assertEquals(1, privacidad)
    }

    @Test
    fun `lista - sesion invalida lleva al login`() {
        coEvery { repositorio.listar() } returns Resultado.Fallo(FalloPolizas.SesionInvalida)
        montarLista()
        compose.waitForIdle()

        assertEquals(1, login)
    }

    @Test
    fun `detalle - muestra la poliza`() {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Exito(Muestras.detalle)
        montarDetalle()
        compose.waitForIdle()

        compose.onNodeWithTag(EtiquetasPrueba.DETALLE).assertIsDisplayed()
    }

    @Test
    fun `detalle - sin red permite reintentar`() {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.SinConexion)
        montarDetalle()
        compose.waitForIdle()

        coEvery { repositorio.detalle("id-1") } returns Resultado.Exito(Muestras.detalle)
        compose.onNodeWithText("Reintentar").performClick()
        compose.waitForIdle()
        compose.onNodeWithTag(EtiquetasPrueba.DETALLE).assertIsDisplayed()
    }

    @Test
    fun `detalle - sesion invalida lleva al login`() {
        coEvery { repositorio.detalle("id-1") } returns Resultado.Fallo(FalloPolizas.SesionInvalida)
        montarDetalle()
        compose.waitForIdle()

        assertEquals(1, login)
    }
}
