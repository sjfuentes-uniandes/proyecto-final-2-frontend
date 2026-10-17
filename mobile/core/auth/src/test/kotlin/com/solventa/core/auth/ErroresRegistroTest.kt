package com.solventa.core.auth

import com.amazonaws.services.cognitoidentityprovider.model.CodeMismatchException
import com.amazonaws.services.cognitoidentityprovider.model.ExpiredCodeException
import com.amazonaws.services.cognitoidentityprovider.model.InvalidPasswordException
import com.amazonaws.services.cognitoidentityprovider.model.LimitExceededException
import com.amazonaws.services.cognitoidentityprovider.model.TooManyRequestsException
import com.amazonaws.services.cognitoidentityprovider.model.UserLambdaValidationException
import com.amazonaws.services.cognitoidentityprovider.model.UsernameExistsException
import org.junit.Test
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertIs

class ErroresRegistroTest {
    @Test
    fun `el rechazo del pre sign-up por REGISTRO_NO_AUTORIZADO pide verificar de nuevo`() {
        val error = UserLambdaValidationException("PreSignUp failed with error REGISTRO_NO_AUTORIZADO.")

        assertEquals(ResultadoRegistroCuenta.TokenRegistroRechazado, mapearErrorRegistro(error))
    }

    @Test
    fun `otro rechazo del Lambda no se confunde con el token de registro`() {
        assertIs<ResultadoRegistroCuenta.ErrorDesconocido>(mapearErrorRegistro(UserLambdaValidationException("otro")))
    }

    @Test
    fun `errores de SignUp conocidos`() {
        assertEquals(ResultadoRegistroCuenta.CorreoYaRegistrado, mapearErrorRegistro(UsernameExistsException("x")))
        assertEquals(ResultadoRegistroCuenta.ContrasenaInvalida, mapearErrorRegistro(InvalidPasswordException("x")))
        assertEquals(ResultadoRegistroCuenta.IntentosExcedidos, mapearErrorRegistro(TooManyRequestsException("x")))
        assertIs<ResultadoRegistroCuenta.SinConexion>(mapearErrorRegistro(IOException("sin red")))
    }

    @Test
    fun `errores de confirmacion conocidos`() {
        assertEquals(ResultadoConfirmacion.CodigoIncorrecto, mapearErrorConfirmacion(CodeMismatchException("x")))
        assertEquals(ResultadoConfirmacion.CodigoVencido, mapearErrorConfirmacion(ExpiredCodeException("x")))
        assertEquals(ResultadoConfirmacion.IntentosExcedidos, mapearErrorConfirmacion(LimitExceededException("x")))
        assertIs<ResultadoConfirmacion.SinConexion>(mapearErrorConfirmacion(IOException()))
    }

    @Test
    fun `errores de reenvio conocidos`() {
        assertEquals(ResultadoReenvioCodigo.IntentosExcedidos, mapearErrorReenvio(LimitExceededException("x")))
        assertIs<ResultadoReenvioCodigo.SinConexion>(mapearErrorReenvio(IOException()))
        assertIs<ResultadoReenvioCodigo.ErrorDesconocido>(mapearErrorReenvio(IllegalStateException("x")))
    }

    @Test
    fun `la clave del ClientMetadata es la acordada con el backend`() {
        assertEquals("tokenRegistro", CLAVE_TOKEN_REGISTRO)
    }
}
