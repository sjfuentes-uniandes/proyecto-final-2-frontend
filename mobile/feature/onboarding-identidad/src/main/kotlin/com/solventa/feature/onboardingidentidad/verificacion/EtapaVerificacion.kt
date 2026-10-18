package com.solventa.feature.onboardingidentidad.verificacion

import com.solventa.feature.onboardingidentidad.captura.PasoCaptura

/** Por qué el proveedor consideró inválida la captura (AC2). `OTRO` cubre motivos nuevos o ausentes. */
enum class MotivoCapturaInvalida {
    ILUMINACION_INSUFICIENTE,
    OTRO;

    companion object {
        fun desde(motivo: String?): MotivoCapturaInvalida =
            entries.firstOrNull { it.name == motivo } ?: OTRO
    }
}

/** Por qué el proveedor rechazó la verificación. `OTRO` cubre motivos nuevos o ausentes. */
enum class MotivoRechazo {
    ROSTRO_NO_COINCIDE,
    OTRO;

    companion object {
        fun desde(motivo: String?): MotivoRechazo =
            entries.firstOrNull { it.name == motivo } ?: OTRO
    }
}

/** En qué punto está la verificación de identidad; la UI se dibuja a partir de este estado. */
sealed interface EtapaVerificacion {
    /** Aún no se sabe si hay permiso de cámara: la UI debe consultarlo o pedirlo. */
    data object PermisoPendiente : EtapaVerificacion

    data object PermisoDenegado : EtapaVerificacion

    /** Cámara activa. [paso] es la guía en vivo (condición a corregir o reto de vida). */
    data class Capturando(val paso: PasoCaptura? = null) : EtapaVerificacion

    data object Enviando : EtapaVerificacion

    /** AC1: identidad verificada. */
    data class Aprobada(val clienteId: String) : EtapaVerificacion

    /** AC2: hay que repetir la captura. No es un rechazo definitivo. */
    data class CapturaInvalida(val motivo: MotivoCapturaInvalida) : EtapaVerificacion

    data class Rechazada(val motivo: MotivoRechazo) : EtapaVerificacion

    /** AC3: la verificación no terminó; reintentar es seguro y no crea otro cliente. */
    data class Interrumpida(val correlationId: String?) : EtapaVerificacion

    /** El correo del formulario no es el de la verificación: hay que verificar de nuevo. */
    data object CorreoDistinto : EtapaVerificacion

    /** Ese correo ya tiene cuenta: la persona debe iniciar sesión. */
    data object CuentaExistente : EtapaVerificacion

    data class ErrorInesperado(val correlationId: String?) : EtapaVerificacion

    /** La persona canceló; la UI debe salir del flujo. */
    data object Cancelada : EtapaVerificacion
}
