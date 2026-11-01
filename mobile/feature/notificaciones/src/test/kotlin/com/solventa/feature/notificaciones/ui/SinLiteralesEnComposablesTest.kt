package com.solventa.feature.notificaciones.ui

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * El lint de Android (`HardcodedText`) no ve un `Text("Hola")` en Compose. Esta prueba lee el
 * código de `:feature:notificaciones` y falla si un archivo con `@Composable` trae un literal de
 * texto con letras: todo texto visible viene de `stringResource` (es-CO y en-US). Mismo criterio y
 * límites que la de `:feature:billetera`.
 */
class SinLiteralesEnComposablesTest {
    @Test
    fun `los composables de notificaciones no tienen literales de texto`() {
        val fuentes = File("src/main/kotlin")
        assertTrue(fuentes.isDirectory, "La prueba corre desde el directorio del módulo: ${fuentes.absolutePath}")

        val hallazgos = hallazgosEn(fuentes)

        if (hallazgos.isNotEmpty()) {
            fail("Textos literales en composables (use stringResource):\n" + hallazgos.joinToString("\n"))
        }
    }

    @Test
    fun `el escaneo falla ante un literal dentro de un composable y pasa sin el`(@TempDir carpeta: File) {
        val archivo = File(carpeta, "Pantalla.kt")

        archivo.writeText("@Composable\nfun P() {\n    Text(\"Hola mundo\")\n}\n")
        assertEquals(listOf("Pantalla.kt:3 \"Hola mundo\""), hallazgosEn(carpeta))

        archivo.writeText("@Composable\nfun P() {\n    Text(stringResource(R.string.saludo))\n}\n")
        assertEquals(emptyList(), hallazgosEn(carpeta))
    }
}

private fun hallazgosEn(fuentes: File): List<String> =
    fuentes.walkTopDown()
        .filter { it.isFile && it.extension == "kt" && it.readText().contains("@Composable") }
        .flatMap { archivo ->
            literalesConLetras(archivo.readText()).map { (linea, literal) -> "${archivo.name}:$linea $literal" }
        }
        .toList()

private val LITERAL = Regex("\"(?:[^\"\\\\\\n]|\\\\.)*\"")
private val PLANTILLA = Regex("\\$\\{[^}]*\\}|\\$[A-Za-z_][A-Za-z0-9_]*")

private fun literalesConLetras(codigo: String): List<Pair<Int, String>> {
    val sinComentarios = codigo
        .replace(Regex("/\\*.*?\\*/", RegexOption.DOT_MATCHES_ALL)) { it.value.replace(Regex("[^\\n]"), " ") }
    return sinComentarios.lines().flatMapIndexed { indice, linea ->
        LITERAL.findAll(linea.substringBefore("//"))
            .map { it.value }
            .filter { literal -> PLANTILLA.replace(literal, "").any(Char::isLetter) }
            .map { (indice + 1) to it }
            .toList()
    }
}
