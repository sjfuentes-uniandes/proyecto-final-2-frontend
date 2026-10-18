package com.solventa.feature.privacidad.casos

import com.solventa.feature.privacidad.dominio.AccionBiometrica
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Otorgamiento
import com.solventa.feature.privacidad.dominio.PROPOSITO_PERFILAMIENTO
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.TextoVigente
import com.solventa.feature.privacidad.dominio.VerificadorBiometrico

/** Consentimientos del titular, del más reciente al más antiguo (orden del servidor). */
class ListarConsentimientos(private val repositorio: RepositorioConsentimientos) {
    suspend operator fun invoke(): Resultado<List<Consentimiento>> = repositorio.listar()
}

/** Detalle y comprobante (AC1). Uno ajeno responde como inexistente. */
class VerDetalleConsentimiento(private val repositorio: RepositorioConsentimientos) {
    suspend operator fun invoke(id: String): Resultado<Consentimiento> = repositorio.detalle(id)
}

/** Texto que se muestra antes de confirmar; su `versionTexto` es la que se envía al otorgar. */
class ObtenerTextoVigente(private val repositorio: RepositorioConsentimientos) {
    suspend operator fun invoke(idioma: String): Resultado<TextoVigente> =
        repositorio.textoVigente(PROPOSITO_PERFILAMIENTO, idioma)
}

/**
 * Otorga el consentimiento (AC1). En orden: un permiso no soportado se rechaza sin llamar a nada
 * (ADR 0001); sin confirmación biométrica no se llama al servidor (ADR 0007, AC2); después se
 * envía con la clave del intento, que el llamador reutiliza al reintentar (AC4).
 */
class OtorgarConsentimiento(
    private val repositorio: RepositorioConsentimientos,
    private val verificador: VerificadorBiometrico,
) {
    suspend operator fun invoke(solicitud: SolicitudOtorgamiento, clave: String): Resultado<Otorgamiento> {
        if (!solicitud.permiso.soportado) return Resultado.Fallo(FalloConsentimiento.PermisoNoDisponible)
        val confirmacion = verificador.confirmar(AccionBiometrica.OTORGAR)
        if (confirmacion != ConfirmacionBiometrica.CONFIRMADA) {
            return Resultado.Fallo(FalloConsentimiento.BiometriaNoConfirmada(confirmacion))
        }
        return repositorio.otorgar(solicitud, clave)
    }
}

/**
 * Revoca el consentimiento (HU-M09 AC1). Sin confirmación biométrica no se llama al servidor
 * (ADR 0007). Repetir es seguro: el servidor es idempotente por estado (AC3) y devuelve el mismo
 * estado, sin otro evento.
 */
class RevocarConsentimiento(
    private val repositorio: RepositorioConsentimientos,
    private val verificador: VerificadorBiometrico,
) {
    suspend operator fun invoke(id: String): Resultado<Consentimiento> {
        val confirmacion = verificador.confirmar(AccionBiometrica.REVOCAR)
        if (confirmacion != ConfirmacionBiometrica.CONFIRMADA) {
            return Resultado.Fallo(FalloConsentimiento.BiometriaNoConfirmada(confirmacion))
        }
        return repositorio.revocar(id)
    }
}

/** Historial de un consentimiento (HU-M09 AC4). Uno ajeno responde como inexistente. */
class VerHistorialConsentimiento(private val repositorio: RepositorioConsentimientos) {
    suspend operator fun invoke(id: String): Resultado<Historial> = repositorio.historial(id)
}
