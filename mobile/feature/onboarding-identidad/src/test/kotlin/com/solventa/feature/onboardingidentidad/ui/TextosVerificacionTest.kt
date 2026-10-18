package com.solventa.feature.onboardingidentidad.ui

import com.solventa.feature.onboardingidentidad.R
import com.solventa.feature.onboardingidentidad.captura.CondicionCaptura
import com.solventa.feature.onboardingidentidad.captura.PasoCaptura
import com.solventa.feature.onboardingidentidad.captura.TipoReto
import com.solventa.feature.onboardingidentidad.verificacion.EtapaVerificacion
import com.solventa.feature.onboardingidentidad.verificacion.MotivoCapturaInvalida
import com.solventa.feature.onboardingidentidad.verificacion.MotivoRechazo
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class TextosVerificacionTest {
    @Test
    fun `cada condicion incumplida tiene su propia guia distinta de la inicial`() {
        val incumplidas = CondicionCaptura.entries.filter { it != CondicionCaptura.OK }

        val recursos = incumplidas.map(::recursoCondicion)

        assertEquals(incumplidas.size, recursos.toSet().size)
        recursos.forEach { assertNotEquals(R.string.onboarding_guia_inicial, it) }
    }

    @Test
    fun `la guia en vivo cubre todos los pasos de la captura`() {
        assertEquals(R.string.onboarding_guia_inicial, recursoGuia(null))
        assertEquals(R.string.onboarding_reto_parpadeo, recursoGuia(PasoCaptura.Reto(TipoReto.PARPADEO)))
        assertEquals(R.string.onboarding_reto_giro, recursoGuia(PasoCaptura.Reto(TipoReto.GIRO_CABEZA)))
        assertEquals(R.string.onboarding_reto_expirado, recursoGuia(PasoCaptura.RetoExpirado(TipoReto.PARPADEO)))
        assertEquals(R.string.onboarding_guia_capturando, recursoGuia(PasoCaptura.Completado))
        assertEquals(
            R.string.onboarding_guia_iluminacion,
            recursoGuia(PasoCaptura.Guia(CondicionCaptura.ILUMINACION_INSUFICIENTE)),
        )
    }

    @Test
    fun `AC1 la identidad aprobada muestra un resultado de exito que permite continuar`() {
        val contenido = assertNotNull(contenidoResultado(EtapaVerificacion.Aprobada("cliente-1")))

        assertEquals(TipoResultado.EXITO, contenido.tipo)
        assertEquals(R.string.onboarding_aprobada_titulo, contenido.titulo)
        assertEquals(AccionResultado.CONTINUAR, contenido.principal)
        assertNull(contenido.secundaria)
    }

    @Test
    fun `AC2 una captura invalida no tiene pantalla de resultado ni se presenta como rechazo`() {
        val etapa = EtapaVerificacion.CapturaInvalida(MotivoCapturaInvalida.ILUMINACION_INSUFICIENTE)

        assertNull(contenidoResultado(etapa))
    }

    @Test
    fun `AC2 la advertencia explica como repetir segun el motivo`() {
        assertEquals(
            R.string.onboarding_advertencia_iluminacion,
            recursoSubtituloAdvertencia(MotivoCapturaInvalida.ILUMINACION_INSUFICIENTE),
        )
        assertEquals(
            R.string.onboarding_advertencia_subtitulo,
            recursoSubtituloAdvertencia(MotivoCapturaInvalida.OTRO),
        )
    }

    @Test
    fun `un rechazo explica el motivo y ofrece intentar de nuevo o cancelar`() {
        val porRostro = assertNotNull(contenidoResultado(EtapaVerificacion.Rechazada(MotivoRechazo.ROSTRO_NO_COINCIDE)))
        val generico = assertNotNull(contenidoResultado(EtapaVerificacion.Rechazada(MotivoRechazo.OTRO)))

        assertEquals(R.string.onboarding_rechazada_rostro, porRostro.mensaje)
        assertEquals(R.string.onboarding_rechazada_generico, generico.mensaje)
        assertEquals(AccionResultado.INTENTAR_DE_NUEVO, porRostro.principal)
        assertEquals(AccionResultado.CANCELAR, porRostro.secundaria)
    }

    @Test
    fun `AC3 una interrupcion informa que no termino, ofrece reintentar y conserva el codigo de soporte`() {
        val contenido = assertNotNull(contenidoResultado(EtapaVerificacion.Interrumpida("corr-7")))

        assertEquals(TipoResultado.INTERRUPCION, contenido.tipo)
        assertEquals(R.string.onboarding_interrumpida_titulo, contenido.titulo)
        assertEquals(AccionResultado.REINTENTAR, contenido.principal)
        assertEquals("corr-7", contenido.correlationId)
    }

    @Test
    fun `un correo distinto permite verificar de nuevo y un correo existente lleva al ingreso`() {
        val distinto = assertNotNull(contenidoResultado(EtapaVerificacion.CorreoDistinto))
        val existente = assertNotNull(contenidoResultado(EtapaVerificacion.CuentaExistente))

        assertEquals(AccionResultado.INTENTAR_DE_NUEVO, distinto.principal)
        assertEquals(AccionResultado.IR_A_INGRESO, existente.principal)
        assertEquals(AccionResultado.CANCELAR, existente.secundaria)
    }

    @Test
    fun `un error inesperado permite intentar de nuevo y conserva el codigo de soporte`() {
        val contenido = assertNotNull(contenidoResultado(EtapaVerificacion.ErrorInesperado("corr-9")))

        assertEquals(AccionResultado.INTENTAR_DE_NUEVO, contenido.principal)
        assertEquals("corr-9", contenido.correlationId)
    }

    @Test
    fun `las etapas que no son un resultado no tienen pantalla de resultado`() {
        listOf(
            EtapaVerificacion.PermisoPendiente,
            EtapaVerificacion.PermisoDenegado,
            EtapaVerificacion.Capturando(),
            EtapaVerificacion.Enviando,
            EtapaVerificacion.Cancelada,
        ).forEach { assertNull(contenidoResultado(it)) }
    }
}
