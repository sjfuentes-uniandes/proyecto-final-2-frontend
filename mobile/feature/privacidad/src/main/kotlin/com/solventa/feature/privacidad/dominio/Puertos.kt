package com.solventa.feature.privacidad.dominio

/** Acceso a los consentimientos del titular autenticado (el `clienteId` sale del token). */
interface RepositorioConsentimientos {
    suspend fun listar(): Resultado<List<Consentimiento>>

    suspend fun detalle(id: String): Resultado<Consentimiento>

    suspend fun textoVigente(proposito: String, idioma: String): Resultado<TextoVigente>

    /** `clave` es la `Idempotency-Key`: la misma en cada reintento del mismo intento. */
    suspend fun otorgar(solicitud: SolicitudOtorgamiento, clave: String): Resultado<Otorgamiento>
}

/**
 * Confirmación biométrica antes de otorgar (ADR 0007: la exige la app, no el servidor). La
 * implementa la UI de la 1.9 sobre `BiometricPrompt`; aquí solo se define el contrato.
 */
fun interface VerificadorBiometrico {
    suspend fun confirmar(): ConfirmacionBiometrica
}

enum class ConfirmacionBiometrica {
    CONFIRMADA,

    /** El cliente cerró el diálogo: no se otorga nada (AC2). */
    CANCELADA,

    /** Sin biometría utilizable en el dispositivo, o bloqueada por intentos. */
    NO_DISPONIBLE,

    /** La huella o el rostro no coincidieron. */
    FALLIDA,
}

/** Genera la `Idempotency-Key` de un intento de otorgar. */
fun interface GeneradorClave {
    fun nueva(): String
}
