package com.solventa.core.auth

/** Estado de la sesión del cliente autenticado contra el pool `clientes` de Cognito. */
sealed class EstadoSesion {
    data object NoAutenticada : EstadoSesion()

    data class Autenticada(val sesion: SesionAuth) : EstadoSesion()
}
