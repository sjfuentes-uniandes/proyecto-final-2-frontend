package com.solventa.feature.privacidad.ui

import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.Historial
import com.solventa.feature.privacidad.dominio.Hito
import com.solventa.feature.privacidad.dominio.TextoVigente
import com.solventa.feature.privacidad.dominio.TipoHito
import java.time.Instant

/**
 * Datos sintéticos para las `@Preview` (solo variante debug). Sin datos personales: imitan lo que
 * devuelve bff-movil, igual que llegarían del servidor.
 */
internal object MuestrasPreview {
    val activo = Consentimiento(
        id = "00000000-0000-4000-9000-000000000001",
        estado = EstadoConsentimiento.ACTIVO,
        proposito = "PERFILAMIENTO_PRECIO",
        alcances = listOf("FA_PRODUCTOS_VIGENTES", "FA_HISTORIAL_PAGOS_12M"),
        versionTexto = "2026-10-17.1",
        idioma = "es-CO",
        otorgadoEn = Instant.parse("2026-10-17T15:00:00Z"),
        vigenteHasta = Instant.parse("2027-10-17T23:59:59Z"),
        revocadoEn = null,
    )

    val revocado = activo.copy(
        id = "00000000-0000-4000-9000-000000000002",
        estado = EstadoConsentimiento.REVOCADO,
        revocadoEn = Instant.parse("2026-11-01T10:00:00Z"),
    )

    /** HU-M09: el servidor respondió `VENCIDO` al revocar (sin `revocadoEn`). */
    val vencido = activo.copy(
        id = "00000000-0000-4000-9000-000000000003",
        estado = EstadoConsentimiento.VENCIDO,
        otorgadoEn = Instant.parse("2025-10-17T15:00:00Z"),
        vigenteHasta = Instant.parse("2026-04-17T15:00:00Z"),
    )

    val historialActivo = Historial(activo.id, EstadoConsentimiento.ACTIVO, listOf(Hito(TipoHito.OTORGADO, activo.otorgadoEn)))

    val historialRevocado = Historial(
        revocado.id,
        EstadoConsentimiento.REVOCADO,
        listOf(Hito(TipoHito.OTORGADO, revocado.otorgadoEn), Hito(TipoHito.REVOCADO, Instant.parse("2026-11-01T10:00:00Z"))),
    )

    val historialVencido = Historial(
        vencido.id,
        EstadoConsentimiento.VENCIDO,
        listOf(Hito(TipoHito.OTORGADO, vencido.otorgadoEn), Hito(TipoHito.VENCIDO, vencido.vigenteHasta)),
    )

    /** Un tipo de hito que esta versión no conoce (backend más nuevo): se muestra genérico. */
    val historialConDesconocido = historialActivo.copy(
        hitos = historialActivo.hitos + Hito(TipoHito.DESCONOCIDO, Instant.parse("2026-11-03T15:00:00Z")),
    )

    val textoEsCo = TextoVigente(
        proposito = "PERFILAMIENTO_PRECIO",
        idioma = "es-CO",
        versionTexto = "2026-10-17.1",
        titulo = "Autorización para consultar datos financieros",
        cuerpo = "Autorizo a Solventa a consultar mis datos de Open Finance y Open Data para calcular mi perfil de riesgo y el precio de mi oferta durante la vigencia elegida.",
        aviso = "Texto de ejemplo, sin validez legal.",
        vigenciasMeses = listOf(6, 12),
        vigenciaDefectoMeses = 12,
    )

    val textoEnUs = textoEsCo.copy(
        idioma = "en-US",
        titulo = "Authorization to access financial data",
        cuerpo = "I authorize Solventa to access my Open Finance and Open Data information to calculate my risk profile and the price of my offer during the chosen period.",
        aviso = "Sample text, no legal validity.",
    )
}
