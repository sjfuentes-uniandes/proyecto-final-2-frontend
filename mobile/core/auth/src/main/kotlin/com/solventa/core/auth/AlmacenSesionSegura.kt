package com.solventa.core.auth

/**
 * Puerto para persistir, entre arranques de la app, qué usuario puede intentar restaurar su
 * sesión en silencio (ver `ClienteIdentidad.restaurarSesion`). Lo implementa `core:security`
 * con almacenamiento cifrado (Android Keystore), para habilitar el desbloqueo biométrico sin
 * pedir usuario/contraseña de nuevo.
 *
 * Los tokens en sí nunca pasan por aquí: ya los cachea el SDK de Cognito. Este puerto solo
 * decide si la app puede *intentar* restaurar la sesión sin que el usuario la autorice de
 * nuevo (p. ej. con su huella).
 */
interface AlmacenSesionSegura {
    fun guardarUsuarioActivo(usuario: String)

    fun usuarioActivo(): String?

    fun limpiar()
}
