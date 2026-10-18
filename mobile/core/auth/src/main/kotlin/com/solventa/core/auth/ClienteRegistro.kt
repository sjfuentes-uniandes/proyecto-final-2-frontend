package com.solventa.core.auth

/** Puerto hacia el registro de cuentas del pool `clientes` de Cognito. */
interface ClienteRegistro {
    /** SignUp con el `tokenRegistro` en `ClientMetadata`, que el pre sign-up valida contra el correo. */
    suspend fun registrar(correo: String, contrasena: String, tokenRegistro: String): ResultadoRegistroCuenta

    suspend fun confirmar(correo: String, codigo: String): ResultadoConfirmacion

    suspend fun reenviarCodigo(correo: String): ResultadoReenvioCodigo
}
