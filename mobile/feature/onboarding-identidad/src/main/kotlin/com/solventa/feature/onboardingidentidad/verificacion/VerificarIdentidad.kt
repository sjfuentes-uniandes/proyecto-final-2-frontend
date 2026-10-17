package com.solventa.feature.onboardingidentidad.verificacion

import com.solventa.core.network.RegistroCliente
import com.solventa.core.network.ResultadoVerificacionRegistro
import com.solventa.feature.onboardingidentidad.captura.SelfieEnMemoria

/**
 * Envía la selfie y la prueba de vida a `POST /v1/registro/verificaciones` (pública: aún no hay
 * cuenta). Codifica la selfie a base64 justo antes de enviarla, de modo que la cadena es transitoria
 * y el [SelfieEnMemoria] sigue siendo el único dueño de la evidencia (y quien puede borrarla).
 * Si el resultado es `Verificada`, el `tokenRegistro` queda en [SesionRegistro] (solo memoria).
 *
 * [selfieDePruebaLocal] es solo para desarrollo contra el backend local: su simulador de KYC decide
 * el resultado por el *texto* de la selfie (p. ej. `selfie-sintetica-aprobada`) y no reconoce una
 * imagen real. Si se indica, se envía ese texto en lugar de la imagen. En builds release es null.
 */
class VerificarIdentidad(
    private val cliente: RegistroCliente,
    private val sesion: SesionRegistro,
    private val selfieDePruebaLocal: String? = null,
) {
    suspend operator fun invoke(selfie: SelfieEnMemoria, pruebaDeVidaCompletada: Boolean): ResultadoVerificacionRegistro {
        val resultado = cliente.verificar(
            registroId = sesion.registroId,
            correo = sesion.correo,
            selfieBase64 = selfieDePruebaLocal ?: selfie.aBase64(),
            pruebaDeVidaCompletada = pruebaDeVidaCompletada,
        )
        when (resultado) {
            is ResultadoVerificacionRegistro.Verificada -> sesion.guardarToken(resultado.tokenRegistro)
            // La verificación quedó ligada a otro correo: el siguiente intento necesita un registroId nuevo.
            is ResultadoVerificacionRegistro.CorreoDistinto -> sesion.reiniciar()
            else -> Unit
        }
        return resultado
    }
}
