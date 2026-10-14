package com.solventa.core.network

/**
 * Puerto para obtener el access token vigente; lo implementa `core:auth` (GestorSesion).
 * `core:network` no conoce Cognito ni el almacenamiento: solo pide el token actual.
 */
fun interface ProveedorAccessToken {
    fun actual(): String?
}
