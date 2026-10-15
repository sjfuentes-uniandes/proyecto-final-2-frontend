package com.solventa.core.auth

/**
 * Tokens vigentes de una sesión autenticada en el pool `clientes` de Cognito.
 * `expiraEnMillis` es el instante (epoch millis, UTC) en el que `accessToken` vence.
 */
data class SesionAuth(
    val accessToken: String,
    val idToken: String,
    val expiraEnMillis: Long,
)
