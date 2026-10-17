package com.solventa.feature.privacidad

import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Prueba de humo del andamiaje (PR 1.7): Compose UI Test corre en la JVM con Robolectric, como
 * JUnit 4 sobre el motor vintage de JUnit 5. Es la base de las pruebas de semántica de la UI.
 * No prueba comportamiento del módulo; se puede borrar cuando haya pruebas reales.
 */
@RunWith(RobolectricTestRunner::class)
class AndamiajeComposeTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun `compose ui test y robolectric leen la semantica`() {
        compose.setContent {
            Text(text = "andamiaje", modifier = Modifier.semantics { contentDescription = "nodo" })
        }

        compose.onNodeWithContentDescription("nodo").assertIsDisplayed()
    }
}
