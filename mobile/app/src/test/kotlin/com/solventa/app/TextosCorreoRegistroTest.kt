package com.solventa.app

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.solventa.feature.onboardingidentidad.R
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class)
class TextosCorreoRegistroTest {
    @Test
    @Config(qualifiers = "es")
    fun `el correo del asesor no es requisito y el conflicto corresponde a un registro iniciado`() {
        val contexto = ApplicationProvider.getApplicationContext<Application>()
        assertEquals(
            "Use un correo al que tenga acceso. Puede ser distinto del registrado por su asesor; lo usaremos para crear y confirmar su cuenta.",
            contexto.getString(R.string.onboarding_correo_ayuda),
        )
        assertEquals(
            "Este documento ya tiene un registro en curso con otro correo. Continúe con el correo que usó al iniciar ese registro. No tiene que coincidir con el registrado por su asesor.",
            contexto.getString(R.string.onboarding_correo_distinto_mensaje),
        )
    }

    @Test
    @Config(qualifiers = "en-rUS")
    fun `la traduccion permite otro correo y conserva la explicacion del registro en curso`() {
        val contexto = ApplicationProvider.getApplicationContext<Application>()
        assertEquals(
            "Use an email you can access. It can differ from the one your advisor entered; we will use it to create and confirm your account.",
            contexto.getString(R.string.onboarding_correo_ayuda),
        )
        assertEquals(
            "This document already has a registration in progress with another email. Continue with the email you used to start that registration. It does not have to match the one your advisor entered.",
            contexto.getString(R.string.onboarding_correo_distinto_mensaje),
        )
    }
}
