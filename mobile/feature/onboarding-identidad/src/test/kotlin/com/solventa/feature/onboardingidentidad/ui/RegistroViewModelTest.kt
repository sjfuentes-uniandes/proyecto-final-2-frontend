package com.solventa.feature.onboardingidentidad.ui

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RegistroViewModelTest {
    private val viewModel = RegistroViewModel()

    private fun llenar(correo: String = "ana@solventa.com", clave: String = "Clave-segura-1", confirmacion: String = clave) {
        viewModel.onCorreoCambiado(correo)
        viewModel.onContrasenaCambiada(clave)
        viewModel.onConfirmacionCambiada(confirmacion)
    }

    @Test
    fun `no se puede registrar sin la identidad verificada aunque el formulario este completo`() {
        llenar()

        assertFalse(viewModel.uiState.value.puedeRegistrar(identidadVerificada = false))
        assertTrue(viewModel.uiState.value.puedeRegistrar(identidadVerificada = true))
    }

    @Test
    fun `exige un correo valido y una contrasena que cumpla la politica`() {
        llenar(correo = "")
        assertFalse(viewModel.uiState.value.puedeRegistrar(true))

        llenar(correo = "sin-arroba")
        assertFalse(viewModel.uiState.value.puedeRegistrar(true))

        llenar(clave = "")
        assertFalse(viewModel.uiState.value.puedeRegistrar(true))
    }

    @Test
    fun `la politica de contrasena pide 10 caracteres con mayuscula minuscula y numero`() {
        assertTrue(cumplePoliticaContrasena("Clave-segura-1"))
        assertFalse(cumplePoliticaContrasena("Corta1a"))
        assertFalse(cumplePoliticaContrasena("sin-mayuscula-1"))
        assertFalse(cumplePoliticaContrasena("SIN-MINUSCULA-1"))
        assertFalse(cumplePoliticaContrasena("Sin-numero-aqui"))
    }

    @Test
    fun `el error del correo aparece al escribir algo invalido o al intentar la biometria sin correo`() {
        assertFalse(viewModel.uiState.value.mostrarErrorCorreo)

        viewModel.marcarCorreoRequerido()
        assertTrue(viewModel.uiState.value.mostrarErrorCorreo)

        viewModel.onCorreoCambiado("ana@solventa.com")
        assertFalse(viewModel.uiState.value.mostrarErrorCorreo)

        viewModel.onCorreoCambiado("ana@")
        assertTrue(viewModel.uiState.value.mostrarErrorCorreo)
    }

    @Test
    fun `la confirmacion debe coincidir con la contrasena`() {
        llenar(clave = "Clave-segura-1", confirmacion = "otra-clave")

        assertFalse(viewModel.uiState.value.contrasenasCoinciden)
        assertFalse(viewModel.uiState.value.puedeRegistrar(true))
    }

    @Test
    fun `no se marca error mientras la confirmacion esta vacia`() {
        viewModel.onContrasenaCambiada("Clave-segura-1")

        assertTrue(viewModel.uiState.value.contrasenasCoinciden)
    }

    @Test
    fun `limpiar borra el formulario incluidas las contrasenas`() {
        llenar()
        viewModel.onCambiarVisibilidadContrasena()

        viewModel.limpiar()

        assertEquals(RegistroUiState(), viewModel.uiState.value)
    }

    @Test
    fun `cada contrasena tiene su propia visibilidad`() {
        viewModel.onCambiarVisibilidadContrasena()

        assertTrue(viewModel.uiState.value.contrasenaVisible)
        assertFalse(viewModel.uiState.value.confirmacionVisible)

        viewModel.onCambiarVisibilidadConfirmacion()
        assertEquals(true to true, viewModel.uiState.value.contrasenaVisible to viewModel.uiState.value.confirmacionVisible)
    }
}
