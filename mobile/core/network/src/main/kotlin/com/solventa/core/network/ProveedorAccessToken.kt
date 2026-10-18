package com.solventa.core.network

/**
 * Puerto para obtener el token de la sesión vigente (el ID token de Cognito, que es el que
 * validan API Gateway y el BFF); lo implementa `core:auth` (GestorSesion).
 * `core:network` no conoce Cognito ni el almacenamiento: solo pide el token actual.
 */
fun interface ProveedorAccessToken {
    fun actual(): String?
}
