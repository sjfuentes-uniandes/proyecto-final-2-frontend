package com.solventa.core.security

/** Si el dispositivo puede usarse para el desbloqueo biométrico (ver [GestorBiometria]). */
enum class Disponibilidad {
    DISPONIBLE,

    /** El dispositivo no tiene sensor biométrico o Android lo considera inutilizable. */
    SIN_HARDWARE,

    /** Hay sensor, pero el usuario no registró huella/rostro en el sistema operativo. */
    SIN_HUELLAS_REGISTRADAS,

    /** Hardware presente pero no disponible en este momento (p. ej. actualizando Google Play Services). */
    NO_DISPONIBLE_TEMPORALMENTE,
}
