package com.solventa.feature.privacidad.ui

import com.solventa.feature.privacidad.R
import com.solventa.feature.privacidad.dominio.ConfirmacionBiometrica
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.ZoneId
import java.util.Locale
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TextosTest {
    private val vencimiento = Instant.parse("2027-10-17T23:59:59Z")

    @Test
    fun `la fecha guardada en UTC se muestra en la zona del dispositivo`() {
        // 23:59 UTC del 17 es el 17 en Bogotá (UTC-5) y ya el 18 en Tokio (UTC+9).
        assertEquals("17 de octubre de 2027", formatearFecha(vencimiento, Locale.forLanguageTag("es-CO"), ZoneId.of("America/Bogota")))
        assertEquals("October 18, 2027", formatearFecha(vencimiento, Locale.US, ZoneId.of("Asia/Tokyo")))
    }

    @Test
    fun `el texto legal se pide en en-US solo con la app en ingles`() {
        assertEquals("en-US", idiomaTexto(Locale.US))
        assertEquals("en-US", idiomaTexto(Locale.UK))
        assertEquals("es-CO", idiomaTexto(Locale.forLanguageTag("es-CO")))
        assertEquals("es-CO", idiomaTexto(Locale.FRANCE))
    }

    @Test
    fun `cada estado tiene su etiqueta con texto`() {
        assertEquals(EtiquetaEstado.SIN_OTORGAR, null.etiqueta())
        assertEquals(EtiquetaEstado.ACTIVA, EstadoConsentimiento.ACTIVO.etiqueta())
        assertEquals(EtiquetaEstado.REVOCADA, EstadoConsentimiento.REVOCADO.etiqueta())
        assertEquals(EtiquetaEstado.VENCIDA, EstadoConsentimiento.VENCIDO.etiqueta())
        assertEquals(EtiquetaEstado.DESCONOCIDA, EstadoConsentimiento.DESCONOCIDO.etiqueta())
    }

    @Test
    fun `cada fallo tiene su mensaje`() {
        val esperados = mapOf(
            FalloConsentimiento.ServicioNoDisponible to R.string.privacidad_error_servicio,
            FalloConsentimiento.RespuestaInvalida to R.string.privacidad_error_inesperado,
            FalloConsentimiento.SesionVencida to R.string.privacidad_error_sesion,
            FalloConsentimiento.NoAutorizado to R.string.privacidad_error_no_autorizado,
            FalloConsentimiento.IdentidadNoVerificada to R.string.privacidad_error_identidad,
            FalloConsentimiento.ClienteNoEncontrado to R.string.privacidad_error_cliente,
            FalloConsentimiento.NoEncontrado to R.string.privacidad_error_no_encontrado,
            FalloConsentimiento.TextoNoVigente to R.string.privacidad_error_texto,
            FalloConsentimiento.IdempotenciaConflicto to R.string.privacidad_error_conflicto,
            FalloConsentimiento.PermisoNoDisponible to R.string.privacidad_error_permiso,
            FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.CANCELADA) to R.string.privacidad_biometria_cancelada,
            FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.FALLIDA) to R.string.privacidad_error_biometria_fallida,
            FalloConsentimiento.BiometriaNoConfirmada(ConfirmacionBiometrica.CONFIRMADA) to R.string.privacidad_error_biometria_fallida,
        )
        esperados.forEach { (fallo, recurso) -> assertEquals(recurso, fallo.mensajeRes(), fallo.toString()) }
    }

    @Test
    fun `los campos del servidor se nombran y los desconocidos se omiten`() {
        assertEquals(R.string.privacidad_campo_proposito, campoRes("proposito"))
        assertEquals(R.string.privacidad_campo_texto, campoRes("versionTexto"))
        assertEquals(R.string.privacidad_campo_texto, campoRes("idioma"))
        assertNull(campoRes("otro"))
        assertNull(alcanceRes("FA_NUEVO"))
        assertEquals(R.string.privacidad_alcance_ingresos, alcanceRes("FA_INGRESOS_AGREGADOS"))
    }
}
