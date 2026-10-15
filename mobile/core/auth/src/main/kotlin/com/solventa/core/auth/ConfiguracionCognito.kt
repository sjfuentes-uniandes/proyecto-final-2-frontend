package com.solventa.core.auth

/**
 * Datos públicos (no son secretos) del pool `clientes` de Cognito para el app client `mobile`
 * (ver `infra/platform/identity.tf` e `outputs.tf` del repo back). Los inyecta la app según el
 * ambiente; `core:auth` no los conoce de antemano.
 */
data class ConfiguracionCognito(
    val poolId: String,
    val clientId: String,
    val region: String,
)
