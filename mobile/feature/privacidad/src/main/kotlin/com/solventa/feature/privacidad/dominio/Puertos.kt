package com.solventa.feature.privacidad.dominio

/** Acceso a los consentimientos del titular autenticado (el `clienteId` sale del token). */
interface RepositorioConsentimientos {
    suspend fun listar(): Resultado<List<Consentimiento>>

    suspend fun detalle(id: String): Resultado<Consentimiento>

    suspend fun textoVigente(proposito: String, idioma: String): Resultado<TextoVigente>

    /** `clave` es la `Idempotency-Key`: la misma en cada reintento del mismo intento. */
    suspend fun otorgar(solicitud: SolicitudOtorgamiento, clave: String): Resultado<Otorgamiento>

    /**
     * Revoca (HU-M09). Sin clave: el servidor es idempotente por estado, así que repetir es seguro y
     * devuelve el mismo estado. El estado resultante puede ser `REVOCADO` o, si ya había vencido,
     * `VENCIDO` con `revocadoEn` nulo.
     */
    suspend fun revocar(id: String): Resultado<Consentimiento>

    suspend fun historial(id: String): Resultado<Historial>
}

/**
 * Confirmación biométrica antes de otorgar o revocar (ADR 0007: la exige la app, no el servidor).
 * La implementa la UI sobre `BiometricPrompt`; `accion` decide qué texto ve el cliente en el diálogo.
 */
fun interface VerificadorBiometrico {
    suspend fun confirmar(accion: AccionBiometrica): ConfirmacionBiometrica
}

/** Qué confirma el cliente con su huella o su rostro. */
enum class AccionBiometrica {
    OTORGAR,
    REVOCAR,
}

enum class ConfirmacionBiometrica {
    CONFIRMADA,

    /** El cliente cerró el diálogo: no se otorga ni se revoca nada (AC2). */
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
